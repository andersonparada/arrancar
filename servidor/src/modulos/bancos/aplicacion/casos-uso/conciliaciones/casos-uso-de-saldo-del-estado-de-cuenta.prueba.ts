import { beforeEach, describe, expect, it } from 'vitest';
import {
  FaltaElSaldoDelEstadoDeCuenta,
  SaldoDelEstadoDeCuentaNoCoincide,
} from '../../../dominio/errores-de-estado-de-cuenta.js';
import { ConciliacionNoEstaEnProceso } from '../../../dominio/errores.js';
import {
  agregarMovimiento,
  casosDeUsoDeConciliaciones,
  inicio,
  marcarSaldoInicial,
  operador,
  otroOperador,
  terminarConSaldo,
} from './soporte-de-pruebas-de-conciliaciones.js';

let entorno: ReturnType<typeof casosDeUsoDeConciliaciones>;

async function iniciarMarcada(): Promise<string> {
  const iniciada = await entorno.casos.iniciar.ejecutar(operador, inicio());
  await entorno.casos.marcar.ejecutar(operador, {
    conciliacionId: iniciada.id,
    movimientoIds: marcarSaldoInicial(iniciada.candidatos),
  });
  return iniciada.id;
}

beforeEach(async () => {
  entorno = casosDeUsoDeConciliaciones();
  await agregarMovimiento(entorno.movimientos, { fecha: '2026-01-01', monto: '1000.00', saldoInicial: true });
});

describe('saldo del estado de cuenta', () => {
  it('transcribir guarda el saldo y muestra la diferencia con el calculado', async () => {
    const id = await iniciarMarcada();

    const dto = await entorno.casos.transcribirSaldo.ejecutar(operador, { conciliacionId: id, saldo: '990.00' });

    expect(dto).toMatchObject({ saldoEstadoDeCuenta: '990.00', diferenciaConElEstadoDeCuenta: '10.00' });
    expect(entorno.auditoria.entradas).toHaveLength(0);
  });

  it('no se puede terminar sin saldo ni con un saldo distinto del calculado', async () => {
    const id = await iniciarMarcada();
    await expect(entorno.casos.terminar.ejecutar(operador, id)).rejects.toThrow(FaltaElSaldoDelEstadoDeCuenta);

    await entorno.casos.transcribirSaldo.ejecutar(operador, { conciliacionId: id, saldo: '999.99' });
    await expect(entorno.casos.terminar.ejecutar(operador, id)).rejects.toThrow(SaldoDelEstadoDeCuentaNoCoincide);
  });

  it('con el saldo correcto termina y ya no se puede transcribir', async () => {
    const id = await iniciarMarcada();
    await entorno.casos.transcribirSaldo.ejecutar(operador, { conciliacionId: id, saldo: '1000.00' });
    expect((await entorno.casos.terminar.ejecutar(operador, id)).estado).toBe('elaborada');

    await expect(
      entorno.casos.transcribirSaldo.ejecutar(operador, { conciliacionId: id, saldo: '1.00' }),
    ).rejects.toThrow(ConciliacionNoEstaEnProceso);
  });

  it('al devolver conserva el saldo y queda en la auditoría tal como estaba', async () => {
    const id = await iniciarMarcada();
    await terminarConSaldo(entorno.casos, operador, id);

    const devuelta = await entorno.casos.devolver.ejecutar(otroOperador, { conciliacionId: id, motivo: 'Revisar' });

    expect(devuelta.saldoEstadoDeCuenta).toBe('1000.00');
    expect(entorno.auditoria.entradas).toContainEqual(
      expect.objectContaining({
        accion: 'devolver',
        anterior: expect.objectContaining({ saldoEstadoDeCuenta: '1000.00' }),
      }),
    );
  });
});
