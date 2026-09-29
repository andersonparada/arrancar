import {
  CONCEPTO_GENERAL,
  conceptosDeMovimientosDe,
  conceptosSembrados,
} from '../../../pruebas/conceptos-de-prueba.js';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AuditoriaEnMemoria,
  CorrelativosEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { CuentaConConciliaciones, NoEsUnSaldoInicial } from '../../../dominio/errores.js';
import type { ConsultasConciliaciones } from '../../puertos/consultas-conciliaciones.js';
import { MovimientosEnMemoria } from '../../../pruebas/dobles-de-movimientos.js';
import type { SolicitudDeMovimiento } from '../../dto/movimiento.dto.js';
import { CrearMovimiento } from './crear-movimiento.js';
import { EliminarSaldoInicial } from './eliminar-saldo-inicial.js';
import { ReglasDeLaCuenta } from '../../reglas-de-la-cuenta.js';
import { PoliticaDeSobregiroFija } from '../../../pruebas/dobles-de-movimientos.js';

const operador = operadorDePrueba();
const CUENTA = '00000000-0000-4000-8000-000000000001';

/** Solo dice si la cuenta ya tiene alguna conciliación; nada más se usa aquí. */
class ConsultasConciliacionesFijas implements Partial<ConsultasConciliaciones> {
  tieneCuentasConConciliaciones = new Set<string>();

  async tieneAlguna(cuentaBancariaId: string): Promise<boolean> {
    return this.tieneCuentasConConciliaciones.has(cuentaBancariaId);
  }
}

const saldoInicial = (cambios: Partial<SolicitudDeMovimiento> = {}): SolicitudDeMovimiento => ({
  cuentaBancariaId: CUENTA,
  tipo: 'credito',
  fecha: '2026-01-01',
  monto: '1000.00',
  saldoInicial: true,
  referencia: null,
  beneficiario: null,
  observaciones: null,
  ...cambios,
});

let registros: MovimientosEnMemoria;
let auditoria: AuditoriaEnMemoria;
let consultasConciliaciones: ConsultasConciliacionesFijas;
let crear: CrearMovimiento;
let eliminar: EliminarSaldoInicial;

beforeEach(() => {
  registros = new MovimientosEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  consultasConciliaciones = new ConsultasConciliacionesFijas();
  const reglas = new ReglasDeLaCuenta({
    consultas: registros,
    politicaDeSobregiro: new PoliticaDeSobregiroFija(false),
  });
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    reglas,
    auditoria,
    correlativos: new CorrelativosEnMemoria(),
    conceptos: conceptosDeMovimientosDe(conceptosSembrados()),
  };
  crear = new CrearMovimiento(dependencias);
  eliminar = new EliminarSaldoInicial({
    unidadDeTrabajo: dependencias.unidadDeTrabajo,
    repositorio: registros,
    consultas: registros,
    consultasConciliaciones: consultasConciliaciones as unknown as ConsultasConciliaciones,
    auditoria,
  });
});

describe('EliminarSaldoInicial', () => {
  it('elimina el saldo inicial si la cuenta no tiene conciliaciones', async () => {
    const creado = await crear.ejecutar(operador, saldoInicial());

    await eliminar.ejecutar(operador, { movimientoId: creado.id, motivo: 'Error de captura' });

    await expect(registros.obtener(creado.id)).rejects.toThrow(RecursoNoEncontrado);
    expect(auditoria.entradas).toContainEqual(
      expect.objectContaining({ recurso: 'bancos.movimientos', registroId: creado.id, accion: 'eliminar' }),
    );
  });

  it('no elimina si la cuenta ya tiene alguna conciliación', async () => {
    const creado = await crear.ejecutar(operador, saldoInicial());
    consultasConciliaciones.tieneCuentasConConciliaciones.add(CUENTA);

    await expect(eliminar.ejecutar(operador, { movimientoId: creado.id, motivo: 'x' })).rejects.toThrow(
      CuentaConConciliaciones,
    );
  });

  it('no elimina una nota desde el endpoint de saldos iniciales', async () => {
    const nota = await crear.ejecutar(operador, {
      ...saldoInicial(),
      saldoInicial: false,
      fecha: '2026-01-05',
      conceptoId: CONCEPTO_GENERAL,
    });

    await expect(eliminar.ejecutar(operador, { movimientoId: nota.id, motivo: 'x' })).rejects.toThrow(
      NoEsUnSaldoInicial,
    );
  });

  it('avisa si no existe', async () => {
    await expect(eliminar.ejecutar(operador, { movimientoId: randomUUID(), motivo: 'x' })).rejects.toThrow(
      RecursoNoEncontrado,
    );
  });
});
