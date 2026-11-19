import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  CorrelativosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { Clase } from '../../../dominio/clase.js';
import {
  ActivoConMovimientos,
  ActivoInvalido,
  ComponenteDeUnComponente,
  DepartamentoDeOtraLocalidad,
  FechaAnteriorAlInicio,
} from '../../../dominio/errores-de-activo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import {
  ActivosEnMemoria,
  CargaInicialDePrueba,
  PrefijoFijo,
  UbicacionesEnMemoria,
} from '../../../pruebas/dobles-de-activos.js';
import { ClasesEnMemoria } from '../../../pruebas/dobles-de-clases.js';
import { CostosEnMemoria } from '../../../pruebas/dobles-de-costos.js';
import type { SolicitudDeActivo } from '../../dto/activo.dto.js';
import { CrearActivo } from './crear-activo.js';
import { EditarActivo } from './editar-activo.js';
import { EliminarActivo } from './eliminar-activo.js';
import { MarcarOcioso } from './marcar-ocioso.js';
import { ListarActivos, ListarUbicaciones, ObtenerActivo } from './consultas-de-activos.js';

const operador = operadorDePrueba();
const LOCALIDAD = randomUUID();
const OTRA_LOCALIDAD = randomUUID();
const DEPARTAMENTO_DE_OTRA = randomUUID();
const DEPARTAMENTO_GENERAL = randomUUID();

let claseId: string;
let activos: ActivosEnMemoria;
let auditoria: AuditoriaEnMemoria;
let carga: CargaInicialDePrueba;
let ubicaciones: UbicacionesEnMemoria;
let clases: ClasesEnMemoria;

const solicitud = (cambios: Partial<SolicitudDeActivo> = {}): SolicitudDeActivo => ({
  codigo: null,
  descripcion: 'Tractor',
  claseId,
  activoPadreId: null,
  tipoDeRegistro: 'activo',
  origen: 'compra',
  propietario: null,
  formaDeTenencia: null,
  fechaDeAdquisicion: '2026-11-01',
  valorComoGanadoComun: null,
  valorDeMatricula: null,
  valorCatastral: null,
  valoresDelInmuebleCompleto: false,
  marca: null,
  modelo: null,
  numeroDeSerie: null,
  placa: null,
  cantidad: 1,
  observaciones: null,
  localidadId: null,
  departamentoId: null,
  responsable: null,
  enBodega: false,
  ...cambios,
});

async function armar() {
  clases = new ClasesEnMemoria();
  const clase = Clase.crear(
    Identificador.desde(operador.empresaId),
    {
      nombre: 'Vehículos',
      incisoFiscal: 'maquinaria_y_vehiculos',
      porcentajeFiscal: '20.00',
      vidaUtilContableMeses: null,
      valorResidualPorcentaje: '0.00',
      activo: true,
    },
    { porcentajeMaximo: 20 },
  );
  await clases.agregar(clase);
  claseId = clase.id.valor;
  activos = new ActivosEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  carga = new CargaInicialDePrueba();
  ubicaciones = new UbicacionesEnMemoria();
  ubicaciones.localidades.set(LOCALIDAD, { id: LOCALIDAD, codigo: 'L1', nombre: 'Finca', activo: true });
  ubicaciones.localidades.set(OTRA_LOCALIDAD, { id: OTRA_LOCALIDAD, codigo: 'L2', nombre: 'Oficina', activo: true });
  ubicaciones.departamentos.set(DEPARTAMENTO_DE_OTRA, {
    id: DEPARTAMENTO_DE_OTRA,
    codigo: 'D1',
    nombre: 'Taller',
    localidadId: OTRA_LOCALIDAD,
    activo: true,
  });
  ubicaciones.departamentos.set(DEPARTAMENTO_GENERAL, {
    id: DEPARTAMENTO_GENERAL,
    codigo: 'D2',
    nombre: 'Contabilidad',
    localidadId: null,
    activo: true,
  });
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: activos,
    consultas: activos,
    consultasDeCostos: new CostosEnMemoria(activos),
    clases,
    auditoria,
    ubicaciones,
    cargaInicial: carga,
    correlativos: new CorrelativosEnMemoria(),
    reloj: new RelojFijo('2026-11-18'),
    prefijo: new PrefijoFijo(),
  };
  return {
    listar: new ListarActivos(dependencias),
    obtener: new ObtenerActivo(dependencias),
    crear: new CrearActivo(dependencias),
    editar: new EditarActivo(dependencias),
    marcarOcioso: new MarcarOcioso(dependencias),
    eliminar: new EliminarActivo(dependencias),
    ubicaciones: new ListarUbicaciones(dependencias),
  };
}

let casos: Awaited<ReturnType<typeof armar>>;

beforeEach(async () => {
  casos = await armar();
});

describe('alta de activos', () => {
  it('propone el código con el prefijo y el correlativo, y salta los que ya existen', async () => {
    const primero = await casos.crear.ejecutar(operador, solicitud());
    await casos.crear.ejecutar(operador, solicitud({ codigo: 'AF-0002' }));
    const tercero = await casos.crear.ejecutar(operador, solicitud());

    expect(primero.codigo).toBe('AF-0001');
    expect(tercero.codigo).toBe('AF-0003');
  });

  it('un activo del balance nace en construcción y el bien de control, en uso', async () => {
    const activo = await casos.crear.ejecutar(operador, solicitud());
    const control = await casos.crear.ejecutar(operador, solicitud({ tipoDeRegistro: 'bien_de_control' }));

    expect(activo.estado).toBe('en_construccion');
    expect(control.estado).toBe('en_uso');
  });

  it('exige una clase que exista y esté activa', async () => {
    const inexistente = casos.crear.ejecutar(operador, solicitud({ claseId: randomUUID() }));
    const clase = await clases.buscar(Identificador.desde(claseId));
    clase!.cambiarDatos({ ...clase!.instantanea(), activo: false }, { porcentajeMaximo: 20 });

    await expect(inexistente).rejects.toThrow(RecursoNoEncontrado);
    await expect(casos.crear.ejecutar(operador, solicitud())).rejects.toThrow(ActivoInvalido);
  });

  it('la adquisición anterior al inicio de la empresa se rechaza: va como saldo inicial', async () => {
    const intento = casos.crear.ejecutar(operador, solicitud({ fechaDeAdquisicion: '2025-12-31' }));

    await expect(intento).rejects.toThrow(FechaAnteriorAlInicio);
  });

  it('valida la localidad y el departamento, aunque el usuario no tenga acceso a la localidad', async () => {
    const buena = await casos.crear.ejecutar(
      operador,
      solicitud({ localidadId: LOCALIDAD, departamentoId: DEPARTAMENTO_GENERAL }),
    );
    const cruzada = casos.crear.ejecutar(
      operador,
      solicitud({ localidadId: LOCALIDAD, departamentoId: DEPARTAMENTO_DE_OTRA }),
    );
    const ajena = casos.crear.ejecutar(operador, solicitud({ localidadId: randomUUID() }));

    expect(buena.localidadId).toBe(LOCALIDAD);
    await expect(cruzada).rejects.toThrow(DepartamentoDeOtraLocalidad);
    await expect(ajena).rejects.toThrow(RecursoNoEncontrado);
  });

  it('un componente cuelga de un activo principal; no de otro componente ni de sí mismo', async () => {
    const motor = await casos.crear.ejecutar(operador, solicitud({ descripcion: 'Motor' }));
    const componente = await casos.crear.ejecutar(operador, solicitud({ activoPadreId: motor.id }));
    const nieto = casos.crear.ejecutar(operador, solicitud({ activoPadreId: componente.id }));

    expect(componente.activoPadreId).toBe(motor.id);
    await expect(nieto).rejects.toThrow(ComponenteDeUnComponente);
  });
});

describe('editar, ocioso y eliminar', () => {
  it('edita lo descriptivo y no deja cambiar la cantidad de un activo en uso', async () => {
    const activo = await casos.crear.ejecutar(operador, solicitud({ tipoDeRegistro: 'bien_de_control' }));
    const {
      codigo: _c,
      tipoDeRegistro: _t,
      localidadId: _l,
      departamentoId: _d,
      responsable: _r,
      enBodega: _e,
      ...base
    } = solicitud();

    const editado = await casos.editar.ejecutar(operador, {
      activoId: activo.id,
      solicitud: { ...base, descripcion: 'Tractor grande' },
    });
    const intento = casos.editar.ejecutar(operador, { activoId: activo.id, solicitud: { ...base, cantidad: 3 } });

    expect(editado.descripcion).toBe('Tractor grande');
    await expect(intento).rejects.toThrow(ActivoInvalido);
  });

  it('marcar y quitar ocioso quedan en la auditoría con cómo estaba', async () => {
    const activo = await casos.crear.ejecutar(operador, solicitud({ tipoDeRegistro: 'bien_de_control' }));

    const ocioso = await casos.marcarOcioso.ejecutar(operador, {
      activoId: activo.id,
      solicitud: { ocioso: true, fecha: '2026-11-10', motivo: 'Sin operador' },
    });
    await casos.marcarOcioso.ejecutar(operador, {
      activoId: activo.id,
      solicitud: { ocioso: false, fecha: '2026-11-12', motivo: null },
    });

    expect(ocioso.ocioso).toBe(true);
    expect(auditoria.entradas.map((e) => [e.recurso, e.accion])).toEqual([
      ['activos-fijos.activos', 'corregir'],
      ['activos-fijos.activos', 'corregir'],
    ]);
    expect((auditoria.entradas[1]!.anterior as { ocioso: boolean }).ocioso).toBe(true);
  });

  it('eliminar deja el rastro en la auditoría y quita el activo', async () => {
    const activo = await casos.crear.ejecutar(operador, solicitud());

    await casos.eliminar.ejecutar(operador, activo.id);

    expect(activos.registros.size).toBe(0);
    expect(auditoria.entradas).toHaveLength(1);
    expect(auditoria.entradas[0]).toMatchObject({ accion: 'eliminar', registroId: activo.id });
  });

  it('no se elimina si tiene traslados o componentes', async () => {
    const principal = await casos.crear.ejecutar(operador, solicitud());
    await casos.crear.ejecutar(operador, solicitud({ activoPadreId: principal.id }));
    const movido = await casos.crear.ejecutar(operador, solicitud());
    activos.conTraslados.add(movido.id);

    await expect(casos.eliminar.ejecutar(operador, principal.id)).rejects.toThrow(ActivoConMovimientos);
    await expect(casos.eliminar.ejecutar(operador, movido.id)).rejects.toThrow(ActivoConMovimientos);
    expect(auditoria.entradas).toEqual([]);
  });

  it('un activo que no existe no se encuentra', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
    await expect(casos.eliminar.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('las ubicaciones activas se ofrecen todas', async () => {
    const dadas = await casos.ubicaciones.ejecutar(operador);

    expect(dadas.localidades).toHaveLength(2);
    expect(dadas.departamentos).toHaveLength(2);
  });
});
