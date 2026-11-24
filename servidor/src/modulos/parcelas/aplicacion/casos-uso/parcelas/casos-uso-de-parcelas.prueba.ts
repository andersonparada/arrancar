import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { ErrorEsperado } from '../../../../core/compartido/dominio/errores.js';
import {
  MadreInactiva,
  MedicionYaAnulada,
  NivelMaximoDeParcelas,
  ParcelaConHijasActivas,
  ParcelaConRegistros,
} from '../../../dominio/errores-de-parcela.js';
import {
  AvisosDeParcelaEnMemoria,
  ConfiguracionDeParcelasFija,
  LigasEnMemoria,
  MedicionesEnMemoria,
  ParcelasEnMemoria,
} from '../../../pruebas/dobles-de-parcelas.js';
import type { SolicitudDeMedicion } from '../../dto/medicion.dto.js';
import type { SolicitudDeParcela } from '../../dto/parcela.dto.js';
import { AnularMedicion } from '../mediciones/anular-medicion.js';
import { RegistrarMedicion } from '../mediciones/registrar-medicion.js';
import { ActualizarParcela } from './actualizar-parcela.js';
import { CrearParcela } from './crear-parcela.js';
import { EliminarParcela } from './eliminar-parcela.js';
import { InactivarParcela } from './inactivar-parcela.js';
import { ObtenerParcela } from './obtener-parcela.js';
import { ObtenerParcelaEnFecha } from './obtener-parcela-en-fecha.js';
import { ReactivarParcela } from './reactivar-parcela.js';

const operador = operadorDePrueba();
const localidadId = randomUUID();
const tipoId = randomUUID();

const medicion = (cambios: Partial<SolicitudDeMedicion> = {}): SolicitudDeMedicion => ({
  vigenteDesde: '2026-01-01',
  fuente: 'escritura',
  cantidadOriginal: '2',
  unidadOriginal: 'manzana',
  varasPorLadoDeCuerda: null,
  cantidadUtil: null,
  documento: null,
  ...cambios,
});

const solicitud = (cambios: Partial<SolicitudDeParcela> = {}): SolicitudDeParcela => ({
  localidadId,
  parcelaMadreId: null,
  tipoId,
  codigo: 'P1',
  nombre: 'Potrero 1',
  formaDeTenencia: 'propia',
  latitud: null,
  longitud: null,
  colindanciaNorte: null,
  colindanciaSur: null,
  colindanciaOriente: null,
  colindanciaPoniente: null,
  observaciones: null,
  inmuebles: [],
  medicion: null,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;
let avisos: AvisosDeParcelaEnMemoria;

function casosDeUso() {
  const parcelas = new ParcelasEnMemoria();
  const mediciones = new MedicionesEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  avisos = new AvisosDeParcelaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: parcelas,
    consultas: parcelas,
    ligas: new LigasEnMemoria(),
    mediciones,
    consultasDeMediciones: mediciones,
    configuracion: new ConfiguracionDeParcelasFija(2),
    avisos,
    reloj: new RelojFijo('2026-11-23'),
    auditoria,
  };
  return {
    crear: new CrearParcela(dependencias),
    actualizar: new ActualizarParcela(dependencias),
    inactivar: new InactivarParcela(dependencias),
    reactivar: new ReactivarParcela(dependencias),
    eliminar: new EliminarParcela(dependencias),
    obtener: new ObtenerParcela(dependencias),
    registrarMedicion: new RegistrarMedicion(dependencias),
    anularMedicion: new AnularMedicion(dependencias),
    enFecha: new ObtenerParcelaEnFecha(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('crear parcelas', () => {
  it('crea la parcela con su primera medición en la misma operación', async () => {
    const ficha = await casos.crear.ejecutar(operador, solicitud({ medicion: medicion({ cantidadUtil: '1.5' }) }));

    expect(ficha).toMatchObject({ nivel: 1, superficieTotalM2: '13974.74', superficieUtilM2: '10481.06' });
    expect(ficha.mediciones).toHaveLength(1);
  });

  it('una subparcela cuelga de su madre, hasta el tope de niveles', async () => {
    const madre = await casos.crear.ejecutar(operador, solicitud());
    const hija = await casos.crear.ejecutar(operador, solicitud({ codigo: 'P1A', parcelaMadreId: madre.id }));

    expect(hija).toMatchObject({ nivel: 2, parcelaMadreCodigo: 'P1' });
    await expect(
      casos.crear.ejecutar(operador, solicitud({ codigo: 'P1A1', parcelaMadreId: hija.id })),
    ).rejects.toThrow(NivelMaximoDeParcelas);
  });

  it('avisa si la madre no existe', async () => {
    const invalida = casos.crear.ejecutar(operador, solicitud({ parcelaMadreId: randomUUID() }));

    await expect(invalida).rejects.toThrow(RecursoNoEncontrado);
  });
});

describe('inactivar, reactivar y eliminar parcelas', () => {
  it('no inactiva una parcela con subparcelas activas', async () => {
    const madre = await casos.crear.ejecutar(operador, solicitud());
    await casos.crear.ejecutar(operador, solicitud({ codigo: 'P1A', parcelaMadreId: madre.id }));

    await expect(casos.inactivar.ejecutar(operador, { parcelaId: madre.id })).rejects.toThrow(ParcelaConHijasActivas);
  });

  it('pregunta a los módulos de rubro y, si uno rechaza, no inactiva', async () => {
    const parcela = await casos.crear.ejecutar(operador, solicitud());
    avisos.rechazarCon = new (class extends ErrorEsperado {
      readonly codigo = 'ciclo_abierto';
    })('Hay un ciclo abierto.');

    await expect(casos.inactivar.ejecutar(operador, { parcelaId: parcela.id })).rejects.toThrow('ciclo abierto');
    expect((await casos.obtener.ejecutar(operador, parcela.id)).activo).toBe(true);
    expect(avisos.recibidos).toEqual([`inactivar:${parcela.id}:2026-11-23`]);
  });

  it('inactiva y reactiva dejando rastro; una subparcela no se reactiva con la madre inactiva', async () => {
    const madre = await casos.crear.ejecutar(operador, solicitud());
    const hija = await casos.crear.ejecutar(operador, solicitud({ codigo: 'P1A', parcelaMadreId: madre.id }));
    await casos.inactivar.ejecutar(operador, { parcelaId: hija.id });
    await casos.inactivar.ejecutar(operador, { parcelaId: madre.id, fecha: '2026-12-01' });

    await expect(casos.reactivar.ejecutar(operador, { parcelaId: hija.id })).rejects.toThrow(MadreInactiva);
    await casos.reactivar.ejecutar(operador, { parcelaId: madre.id });
    await casos.reactivar.ejecutar(operador, { parcelaId: hija.id });

    expect(auditoria.acciones()).toEqual([
      'parcelas.parcelas:inactivar',
      'parcelas.parcelas:inactivar',
      'parcelas.parcelas:reactivar',
      'parcelas.parcelas:reactivar',
    ]);
  });

  it('no elimina una con subparcelas o con medición vigente; sí una sin nada, y la deja en la auditoría', async () => {
    const madre = await casos.crear.ejecutar(operador, solicitud());
    await casos.crear.ejecutar(operador, solicitud({ codigo: 'P1A', parcelaMadreId: madre.id }));
    const medida = await casos.crear.ejecutar(
      operador,
      solicitud({ codigo: 'P2', nombre: 'P2', medicion: medicion() }),
    );
    const vacia = await casos.crear.ejecutar(operador, solicitud({ codigo: 'P3', nombre: 'P3' }));

    await expect(casos.eliminar.ejecutar(operador, madre.id)).rejects.toThrow(ParcelaConRegistros);
    await expect(casos.eliminar.ejecutar(operador, medida.id)).rejects.toThrow(ParcelaConRegistros);
    await casos.eliminar.ejecutar(operador, vacia.id);

    await expect(casos.obtener.ejecutar(operador, vacia.id)).rejects.toThrow(RecursoNoEncontrado);
    expect(auditoria.acciones()).toEqual(['parcelas.parcelas:eliminar']);
    expect(avisos.recibidos).toEqual([`eliminar:${vacia.id}`]);
  });

  it('una parcela con solo mediciones anuladas se elimina junto con ellas', async () => {
    const parcela = await casos.crear.ejecutar(operador, solicitud({ medicion: medicion() }));
    await casos.anularMedicion.ejecutar(operador, {
      medicionId: parcela.mediciones[0]!.id,
      solicitud: { motivo: 'Error' },
    });

    await casos.eliminar.ejecutar(operador, parcela.id);

    expect(auditoria.acciones()).toEqual(['parcelas.mediciones:anular', 'parcelas.parcelas:eliminar']);
  });
});

describe('editar parcelas', () => {
  it('cambia sus datos y quitar un inmueble deja rastro', async () => {
    const [uno, dos] = [randomUUID(), randomUUID()];
    const parcela = await casos.crear.ejecutar(
      operador,
      solicitud({
        inmuebles: [
          { inmuebleId: uno, superficieM2: null },
          { inmuebleId: dos, superficieM2: '100.00' },
        ],
      }),
    );

    const {
      inmuebles: _ligas,
      medicion: _medicion,
      localidadId: _l,
      parcelaMadreId: _m,
      codigo: _c,
      ...cambio
    } = solicitud();
    const editada = await casos.actualizar.ejecutar(operador, {
      parcelaId: parcela.id,
      solicitud: { ...cambio, nombre: 'Potrero Norte', inmuebles: [{ inmuebleId: uno, superficieM2: null }] },
    });

    expect(editada).toMatchObject({ nombre: 'Potrero Norte', codigo: 'P1' });
    expect(editada.inmuebles.map(({ inmuebleId }) => inmuebleId)).toEqual([uno]);
    expect(auditoria.acciones()).toEqual(['parcelas.parcelas:quitar']);
  });
});

describe('mediciones', () => {
  it('la medición más reciente fija la superficie de la parcela', async () => {
    const parcela = await casos.crear.ejecutar(operador, solicitud({ medicion: medicion() }));

    const ficha = await casos.registrarMedicion.ejecutar(operador, {
      parcelaId: parcela.id,
      solicitud: medicion({ vigenteDesde: '2026-06-01', cantidadOriginal: '3' }),
    });

    expect(ficha.superficieTotalM2).toBe('20962.12');
    expect(ficha.mediciones.map(({ vigenteDesde }) => vigenteDesde).sort()).toEqual(['2026-01-01', '2026-06-01']);
  });

  it('anular la vigente devuelve la superficie a la anterior, y sin ninguna la deja vacía', async () => {
    const parcela = await casos.crear.ejecutar(operador, solicitud({ medicion: medicion() }));
    const dos = await casos.registrarMedicion.ejecutar(operador, {
      parcelaId: parcela.id,
      solicitud: medicion({ vigenteDesde: '2026-06-01', cantidadOriginal: '3' }),
    });
    const reciente = dos.mediciones.find(({ vigenteDesde }) => vigenteDesde === '2026-06-01')!;

    const anulada = await casos.anularMedicion.ejecutar(operador, {
      medicionId: reciente.id,
      solicitud: { motivo: 'Medida equivocada' },
    });
    const anteriorId = anulada.mediciones.find(({ estado }) => estado === 'vigente')!.id;
    const sinNinguna = await casos.anularMedicion.ejecutar(operador, {
      medicionId: anteriorId,
      solicitud: { motivo: 'Tampoco' },
    });

    expect(anulada.superficieTotalM2).toBe('13974.74');
    expect(sinNinguna.superficieTotalM2).toBeNull();
    await expect(
      casos.anularMedicion.ejecutar(operador, { medicionId: reciente.id, solicitud: { motivo: 'Otra vez' } }),
    ).rejects.toThrow(MedicionYaAnulada);
  });

  it('la orden del mediador da la superficie que regía en la fecha', async () => {
    const parcela = await casos.crear.ejecutar(operador, solicitud({ medicion: medicion() }));
    await casos.registrarMedicion.ejecutar(operador, {
      parcelaId: parcela.id,
      solicitud: medicion({ vigenteDesde: '2026-06-01', cantidadOriginal: '3' }),
    });

    const antes = await casos.enFecha.ejecutar({ parcelaId: parcela.id, fecha: '2026-03-01' });
    const despues = await casos.enFecha.ejecutar({ parcelaId: parcela.id, fecha: '2026-07-01' });

    expect(antes).toMatchObject({ codigo: 'P1', superficieTotalM2: '13974.74', uso: null, cedidaATerceros: false });
    expect(despues.superficieTotalM2).toBe('20962.12');
  });
});
