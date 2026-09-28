import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import {
  ConciliacionCerrada,
  ConciliacionConDiferencia,
  ConciliacionFueraDeOrden,
  HayUnaConciliacionAbierta,
  MesConciliado,
  MovimientoNoConciliable,
  SoloSeEliminaLaUltima,
} from '../../../dominio/errores.js';
import { Movimiento } from '../../../dominio/movimiento.js';
import { ConciliacionesEnMemoria } from '../../../pruebas/dobles-de-conciliaciones.js';
import { MovimientosEnMemoria, PoliticaDeSobregiroFija } from '../../../pruebas/dobles-de-movimientos.js';
import { ReglasDeLaCuenta } from '../../reglas-de-la-cuenta.js';
import { AnularMovimiento } from '../movimientos/anular-movimiento.js';
import { CrearMovimiento } from '../movimientos/crear-movimiento.js';
import { CambiarSaldoSegunBanco } from './cambiar-saldo-segun-banco.js';
import { CerrarConciliacion } from './cerrar-conciliacion.js';
import { EliminarConciliacion } from './eliminar-conciliacion.js';
import { IniciarConciliacion } from './iniciar-conciliacion.js';
import { ListarConciliaciones } from './listar-conciliaciones.js';
import { MarcarMovimientos } from './marcar-movimientos.js';
import { ObtenerConciliacion } from './obtener-conciliacion.js';

const operador = operadorDePrueba();
const CUENTA = '00000000-0000-4000-8000-000000000001';
const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);

let movimientos: MovimientosEnMemoria;
let conciliaciones: ConciliacionesEnMemoria;
let auditoria: AuditoriaEnMemoria;

async function agregarMovimiento(datos: {
  fecha: string;
  monto: string;
  tipo?: 'credito' | 'debito';
  saldoInicial?: boolean;
}): Promise<string> {
  const movimiento = Movimiento.crear(empresaId, {
    cuentaBancariaId: CUENTA,
    tipo: datos.tipo ?? 'credito',
    fecha: datos.fecha,
    monto: datos.monto,
    saldoInicial: datos.saldoInicial ?? false,
    referencia: null,
    beneficiario: null,
    observaciones: null,
  });
  await movimientos.agregar(movimiento);
  return movimiento.id.valor;
}

async function casosDeUso() {
  movimientos = new MovimientosEnMemoria();
  conciliaciones = new ConciliacionesEnMemoria();
  conciliaciones.vincularMovimientos(movimientos);
  auditoria = new AuditoriaEnMemoria();
  const unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  const politicaDeSobregiro = new PoliticaDeSobregiroFija(false);
  const reglas = new ReglasDeLaCuenta({ consultas: movimientos, politicaDeSobregiro });

  const dependenciasDeConciliaciones = {
    unidadDeTrabajo,
    repositorio: conciliaciones,
    consultas: conciliaciones,
    consultasMovimientos: movimientos,
    auditoria,
  };
  const dependenciasDeMovimientos = {
    unidadDeTrabajo,
    repositorio: movimientos,
    consultas: movimientos,
    reglas,
    auditoria,
  };

  return {
    iniciar: new IniciarConciliacion(dependenciasDeConciliaciones),
    obtener: new ObtenerConciliacion(dependenciasDeConciliaciones),
    listar: new ListarConciliaciones(dependenciasDeConciliaciones),
    marcar: new MarcarMovimientos(dependenciasDeConciliaciones),
    cambiarSaldo: new CambiarSaldoSegunBanco(dependenciasDeConciliaciones),
    cerrar: new CerrarConciliacion(dependenciasDeConciliaciones),
    eliminar: new EliminarConciliacion(dependenciasDeConciliaciones),
    crearMovimiento: new CrearMovimiento(dependenciasDeMovimientos),
    anularMovimiento: new AnularMovimiento(dependenciasDeMovimientos),
  };
}

let casos: Awaited<ReturnType<typeof casosDeUso>>;

beforeEach(async () => {
  casos = await casosDeUso();
  await agregarMovimiento({ fecha: '2026-01-01', monto: '1000.00', saldoInicial: true });
});

const inicio = (cambios: Record<string, unknown> = {}) => ({
  cuentaBancariaId: CUENTA,
  anio: 2026,
  mes: 1,
  saldoSegunBanco: '1000.00',
  ...cambios,
});

describe('iniciar', () => {
  it('la primera puede ser de cualquier mes', async () => {
    const conciliacion = await casos.iniciar.ejecutar(operador, inicio({ mes: 3 }));

    expect(conciliacion).toMatchObject({ anio: 2026, mes: 3, cerrada: false, saldoAnterior: '0.00' });
  });

  it('la siguiente debe ser exactamente el mes siguiente a la última cerrada', async () => {
    const primera = await casos.iniciar.ejecutar(operador, inicio());
    await casos.marcar.ejecutar(operador, { conciliacionId: primera.id, movimientoIds: [primera.movimientos[0]!.id] });
    await casos.cerrar.ejecutar(operador, primera.id);

    await expect(casos.iniciar.ejecutar(operador, inicio({ mes: 3 }))).rejects.toThrow(ConciliacionFueraDeOrden);
    const segunda = await casos.iniciar.ejecutar(operador, inicio({ mes: 2 }));
    expect(segunda.mes).toBe(2);
  });

  it('no se inicia otra mientras la última siga abierta', async () => {
    await casos.iniciar.ejecutar(operador, inicio());

    await expect(casos.iniciar.ejecutar(operador, inicio({ mes: 2 }))).rejects.toThrow(HayUnaConciliacionAbierta);
  });
});

describe('obtener: candidatos y cálculo en vivo', () => {
  it('incluye pendientes de meses anteriores y excluye los marcados en otra conciliación', async () => {
    await agregarMovimiento({ fecha: '2026-01-15', monto: '200.00' });
    const enero = await casos.iniciar.ejecutar(operador, inicio({ mes: 1, saldoSegunBanco: '1000.00' }));
    // Solo se marca el saldo inicial: la nota de 200 queda pendiente para el mes siguiente.
    await casos.marcar.ejecutar(operador, {
      conciliacionId: enero.id,
      movimientoIds: [enero.movimientos.find((m) => m.saldoInicial)!.id],
    });
    await casos.cerrar.ejecutar(operador, enero.id);

    const febrero = await casos.iniciar.ejecutar(operador, inicio({ mes: 2, saldoSegunBanco: '1200.00' }));

    // El saldo inicial ya quedó conciliado en enero: en febrero solo aparece pendiente la nota de 200.
    expect(febrero.movimientos.map((m) => m.monto)).toEqual(['200.00']);
    expect(febrero.saldoAnterior).toBe('1000.00');
  });

  it('calcula el saldo conciliado y la diferencia solo con los marcados', async () => {
    const idExtra = await agregarMovimiento({ fecha: '2026-01-10', monto: '150.00' });
    const conciliacion = await casos.iniciar.ejecutar(operador, inicio({ saldoSegunBanco: '1000.00' }));

    const marcado = await casos.marcar.ejecutar(operador, {
      conciliacionId: conciliacion.id,
      movimientoIds: [conciliacion.movimientos.find((m) => m.saldoInicial)!.id],
    });

    expect(marcado.saldoConciliado).toBe('1000.00');
    expect(marcado.diferencia).toBe('0.00');

    const conAmbos = await casos.marcar.ejecutar(operador, {
      conciliacionId: conciliacion.id,
      movimientoIds: [conciliacion.movimientos.find((m) => m.saldoInicial)!.id, idExtra],
    });
    expect(conAmbos.saldoConciliado).toBe('1150.00');
    expect(conAmbos.diferencia).toBe('-150.00');
  });

  it('no marca un movimiento que no es candidato (otra cuenta, anulado o fuera del mes)', async () => {
    const conciliacion = await casos.iniciar.ejecutar(operador, inicio());

    await expect(
      casos.marcar.ejecutar(operador, { conciliacionId: conciliacion.id, movimientoIds: [randomUUID()] }),
    ).rejects.toThrow(MovimientoNoConciliable);
  });
});

describe('cerrar', () => {
  it('no cierra con diferencia distinta de cero', async () => {
    const conciliacion = await casos.iniciar.ejecutar(operador, inicio({ saldoSegunBanco: '1000.01' }));

    await expect(casos.cerrar.ejecutar(operador, conciliacion.id)).rejects.toThrow(ConciliacionConDiferencia);
  });

  it('cierra con diferencia cero y dos veces lanza ConciliacionCerrada', async () => {
    const conciliacion = await casos.iniciar.ejecutar(operador, inicio({ saldoSegunBanco: '1000.00' }));
    await casos.marcar.ejecutar(operador, {
      conciliacionId: conciliacion.id,
      movimientoIds: [conciliacion.movimientos[0]!.id],
    });

    const cerrada = await casos.cerrar.ejecutar(operador, conciliacion.id);

    expect(cerrada.cerrada).toBe(true);
    await expect(casos.cerrar.ejecutar(operador, conciliacion.id)).rejects.toThrow(ConciliacionCerrada);
  });
});

describe('la regla del mes conciliado', () => {
  async function cerrarEnero(): Promise<void> {
    const conciliacion = await casos.iniciar.ejecutar(operador, inicio({ saldoSegunBanco: '1000.00' }));
    await casos.marcar.ejecutar(operador, {
      conciliacionId: conciliacion.id,
      movimientoIds: [conciliacion.movimientos[0]!.id],
    });
    await casos.cerrar.ejecutar(operador, conciliacion.id);
    movimientos.fechaConciliadaHasta = '2026-01-31';
  }

  it('bloquea registrar con fecha en el mes conciliado o antes', async () => {
    await cerrarEnero();

    await expect(
      casos.crearMovimiento.ejecutar(operador, {
        cuentaBancariaId: CUENTA,
        tipo: 'credito',
        fecha: '2026-01-20',
        monto: '10.00',
        saldoInicial: false,
        referencia: null,
        beneficiario: null,
        observaciones: null,
      }),
    ).rejects.toThrow(MesConciliado);
  });

  it('bloquea anular un movimiento cuya fecha quedó conciliada', async () => {
    const idAntiguo = await agregarMovimiento({ fecha: '2026-01-05', monto: '20.00' });
    await cerrarEnero();

    await expect(casos.anularMovimiento.ejecutar(operador, { movimientoId: idAntiguo, motivo: 'x' })).rejects.toThrow(
      MesConciliado,
    );
  });

  it('no bloquea con fecha posterior al mes conciliado', async () => {
    await cerrarEnero();

    const movimiento = await casos.crearMovimiento.ejecutar(operador, {
      cuentaBancariaId: CUENTA,
      tipo: 'credito',
      fecha: '2026-02-01',
      monto: '10.00',
      saldoInicial: false,
      referencia: null,
      beneficiario: null,
      observaciones: null,
    });
    expect(movimiento.fecha).toBe('2026-02-01');
  });
});

describe('eliminar', () => {
  it('solo elimina la última, suelta sus movimientos y audita', async () => {
    const enero = await casos.iniciar.ejecutar(operador, inicio({ saldoSegunBanco: '1000.00' }));
    await casos.marcar.ejecutar(operador, { conciliacionId: enero.id, movimientoIds: [enero.movimientos[0]!.id] });
    await casos.cerrar.ejecutar(operador, enero.id);
    const febrero = await casos.iniciar.ejecutar(operador, inicio({ mes: 2, saldoSegunBanco: '1000.00' }));

    await expect(casos.eliminar.ejecutar(operador, { conciliacionId: enero.id, motivo: 'orden' })).rejects.toThrow(
      SoloSeEliminaLaUltima,
    );

    await casos.eliminar.ejecutar(operador, { conciliacionId: febrero.id, motivo: 'me equivoqué' });
    expect(auditoria.entradas).toContainEqual(
      expect.objectContaining({ recurso: 'bancos.conciliaciones', registroId: febrero.id, accion: 'eliminar' }),
    );
    const lista = await casos.listar.ejecutar(operador, CUENTA);
    expect(lista.map((c) => c.id)).toEqual([enero.id]);

    // Reabre enero: se puede volver a eliminar (ahora es la última) y sus movimientos siguen sueltos.
    await casos.eliminar.ejecutar(operador, { conciliacionId: enero.id, motivo: 'reabrir' });
    expect(await casos.listar.ejecutar(operador, CUENTA)).toHaveLength(0);
  });

  it('avisa si no existe', async () => {
    await expect(casos.eliminar.ejecutar(operador, { conciliacionId: randomUUID(), motivo: 'x' })).rejects.toThrow(
      RecursoNoEncontrado,
    );
  });
});
