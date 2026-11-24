import { beforeEach, describe, expect, it } from 'vitest';
import { ActivoInvalido, FechaAnteriorAlInicio } from '../../../dominio/errores-de-activo.js';
import { ActivoDeSaldoInicial, ActivosConFechaFueraDeLaCarga } from '../../../dominio/errores-de-saldo-inicial.js';
import {
  armarSaldos,
  operador,
  solicitudDeSaldo,
  type EscenarioDeSaldos,
} from '../../../pruebas/escenario-de-saldos.soporte.js';
import { EditarActivo } from '../activos/editar-activo.js';
import { EliminarActivo } from '../activos/eliminar-activo.js';
import { QuitarDeUso } from '../activos/quitar-de-uso.js';
import { ListarSaldosIniciales } from './consultas-de-saldos-iniciales.js';
import { RevisarCierreDeCargaEnActivosFijos } from './revisar-cierre-de-carga-en-activos-fijos.js';
import { ValidarFechaDeInicioEnActivosFijos } from './validar-fecha-de-inicio-en-activos-fijos.js';

let e: EscenarioDeSaldos;
let camionesId: string;

const cargar = (cambios: Parameters<typeof solicitudDeSaldo>[1] = {}) =>
  e.guardar.ejecutar(operador, solicitudDeSaldo(camionesId, cambios));
const revisar = () =>
  new RevisarCierreDeCargaEnActivosFijos(e.dependencias).ejecutar(operador, { fechaDeInicio: '2026-01-01' });
const codigos = (revision: Awaited<ReturnType<typeof revisar>>) =>
  revision.hallazgos.map((hallazgo) => hallazgo.codigo);

beforeEach(async () => {
  e = armarSaldos();
  camionesId = await e.claseDe('maquinaria_y_vehiculos', '20.00');
});

describe('la pregunta de EM-2 (revisar el cierre de la carga)', () => {
  it('sin ningún saldo responde el aviso sin_saldos_iniciales, con el día de corte en el mensaje', async () => {
    const revision = await revisar();

    expect(revision).toMatchObject({ nombreDelModulo: 'Activos fijos', ruta: '/activos-fijos/saldos-iniciales' });
    expect(revision.resumen).toBe('0 activos de saldo inicial al 31/12/2025');
    expect(revision.hallazgos).toEqual([expect.objectContaining({ codigo: 'sin_saldos_iniciales', nivel: 'aviso' })]);
    expect(revision.hallazgos[0]!.mensaje).toContain('31/12/2025');
  });

  it('da las cifras del cuadre, general y por clase, y avisa de lo que falta (todo son avisos)', async () => {
    await cargar();
    await cargar({ vidaUtilRestanteMeses: 0, descripcion: 'Vida agotada' });
    await cargar({
      enConstruccion: true,
      fechaDeInicioDeUso: null,
      depreciacionAcumuladaContable: '0.00',
      depreciacionAcumuladaFiscal: '0.00',
      vidaUtilRestanteMeses: null,
      descripcion: 'Bodega nueva',
    });

    const revision = await revisar();

    expect(revision.resumen).toBe('3 activos de saldo inicial al 31/12/2025');
    expect(codigos(revision)).toEqual(['vida_agotada_con_saldo', 'sin_ubicacion', 'en_construccion']);
    expect(revision.hallazgos.every((hallazgo) => hallazgo.nivel === 'aviso')).toBe(true);
    expect(revision.hallazgos[0]!.mensaje).toContain('Q70,000.00');
    expect(revision.hallazgos[2]!.mensaje).toContain('Q120,000.00');
    const generales = Object.fromEntries(
      revision.cifras.filter((c) => c.registro === null).map((c) => [c.clave, c.valor]),
    );
    expect(generales).toEqual({
      activos: '3',
      costo: '360000.00',
      depreciacion_acumulada_contable: '100000.00',
      valor_en_libros: '260000.00',
      costo_fiscal: '360000.00',
      base_fiscal: '360000.00',
      depreciacion_acumulada_fiscal: '144000.00',
    });
    expect(revision.cifras.filter((c) => c.registro !== null).map((c) => [c.clave, c.valor])).toEqual([
      ['costo_de_clase', '360000.00'],
      ['depreciacion_de_clase', '100000.00'],
    ]);
  });

  it('con una localidad no avisa de la falta de ubicación', async () => {
    const localidadId = crypto.randomUUID();
    e.ubicaciones.localidades.set(localidadId, { id: localidadId, codigo: 'FINCA', nombre: 'Finca', activo: true });
    await cargar({ localidadId });

    expect(codigos(await revisar())).toEqual([]);
  });

  it('el listado trae el estado de la carga y los totales del cuadre', async () => {
    await cargar();
    e.carga.estado = { fechaDeInicio: '2026-01-01', cerrada: true };

    const lista = await new ListarSaldosIniciales(e.dependencias).ejecutar(operador);

    expect(lista).toMatchObject({ fechaDeInicio: '2026-01-01', fechaDeCorte: '2025-12-31', cargaCerrada: true });
    expect(lista.totales).toMatchObject({ activos: 1, costo: '120000.00', valorEnLibros: '70000.00' });
    expect(lista.porClase).toEqual([
      {
        claseId: expect.any(String),
        clase: 'Clase de prueba',
        costo: '120000.00',
        depreciacionAcumuladaContable: '50000.00',
      },
    ]);
  });
});

describe('el aviso de cambio de la fecha de inicio', () => {
  const validar = (fechaDeInicio = '2026-03-01') =>
    new ValidarFechaDeInicioEnActivosFijos(e.dependencias).ejecutar(operador, {
      empresaId: operador.empresaId,
      fechaDeInicio,
    });

  it('sin conflictos deja pasar el cambio y reubica el día de corte y el mes de los tramos', async () => {
    await validar('2026-03-01');

    expect(e.saldos.reubicadas).toEqual(['2026-03-01']);
  });

  it.each([
    ['un cierre de depreciación', { hayCierres: true }],
    ['saldos con fechas desde la fecha nueva', { saldosConFechaPosterior: 2 }],
    ['activos de otro origen con adquisición anterior', { otrosConAdquisicionAnterior: 1 }],
    ['saldos con divisiones vigentes', { saldosConDivisiones: 1 }],
  ])('rechaza el cambio por %s y no reubica nada', async (_caso, conflicto) => {
    e.saldos.conflictos = {
      saldosConFechaPosterior: 0,
      otrosConAdquisicionAnterior: 0,
      saldosConDivisiones: 0,
      hayCierres: false,
      ...conflicto,
    };

    await expect(validar()).rejects.toBeInstanceOf(ActivosConFechaFueraDeLaCarga);
    expect(e.saldos.reubicadas).toEqual([]);
  });
});

describe('el activo de saldo inicial en las pantallas generales de activos', () => {
  it('no se elimina ni se quita de uso por la ficha: se corrige en Saldos iniciales', async () => {
    const saldo = await cargar();
    const generales = {
      ...e.dependencias,
      consultas: e.activos,
      consultasDeCostos: e.costos,
      topes: e.dependencias.topes,
      primerMes: { paraEmpresa: async () => 'mes_de_inicio' as const },
    };

    await expect(new EliminarActivo(generales).ejecutar(operador, saldo.activoId)).rejects.toBeInstanceOf(
      ActivoDeSaldoInicial,
    );
    await expect(new QuitarDeUso(generales).ejecutar(operador, saldo.activoId)).rejects.toBeInstanceOf(
      ActivoDeSaldoInicial,
    );
    expect(e.activos.registros.has(saldo.activoId)).toBe(true);
  });

  it('en la ficha solo cambian los datos descriptivos: ni la fecha de adquisición ni la cantidad', async () => {
    const saldo = await cargar({
      enConstruccion: true,
      fechaDeInicioDeUso: null,
      depreciacionAcumuladaContable: '0.00',
      depreciacionAcumuladaFiscal: '0.00',
      vidaUtilRestanteMeses: null,
    });
    const editar = new EditarActivo({ ...e.dependencias, consultas: e.activos, consultasDeCostos: e.costos });
    const edicion = (cambios: Record<string, unknown>) => ({
      activoId: saldo.activoId,
      solicitud: {
        descripcion: 'Camión',
        claseId: camionesId,
        activoPadreId: null,
        origen: 'saldo_inicial' as const,
        propietario: null,
        formaDeTenencia: null,
        fechaDeAdquisicion: '2024-01-15',
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
        ...cambios,
      },
    });

    await expect(editar.ejecutar(operador, edicion({ fechaDeAdquisicion: '2024-02-01' }))).rejects.toBeInstanceOf(
      FechaAnteriorAlInicio,
    );
    await expect(editar.ejecutar(operador, edicion({ cantidad: 5 }))).rejects.toBeInstanceOf(ActivoInvalido);
    await editar.ejecutar(operador, edicion({ marca: 'Isuzu' }));
    expect(e.activos.registros.get(saldo.activoId)!.instantanea().marca).toBe('Isuzu');
  });
});
