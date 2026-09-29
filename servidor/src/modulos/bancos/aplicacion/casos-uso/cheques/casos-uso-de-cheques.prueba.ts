import { CONCEPTO_GENERAL } from '../../../pruebas/conceptos-de-prueba.js';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BeneficiarioObligatorio,
  ChequeNoDisponible,
  MovimientoDeCheque,
  SaldoInsuficiente,
} from '../../../dominio/errores.js';
import { CUENTA, armarEntorno, emisionDe, operador } from './soporte-de-pruebas-de-cheques.js';

let casos: Awaited<ReturnType<typeof armarEntorno>>;

beforeEach(async () => {
  casos = await armarEntorno();
});

const emision = (cambios: Record<string, unknown> = {}) => emisionDe(casos.chequeId, cambios);

describe('siguiente disponible', () => {
  it('es el primer número del rango recién creado', async () => {
    const siguiente = await casos.siguiente.ejecutar(operador, CUENTA);

    expect(siguiente?.numero).toBe(1);
  });

  it('es null si no hay chequeras activas con cheques disponibles', async () => {
    const otraCuenta = '00000000-0000-4000-8000-000000000009';

    const siguiente = await casos.siguiente.ejecutar(operador, otraCuenta);

    expect(siguiente).toBeNull();
  });
});

describe('emitir', () => {
  it('crea el movimiento tipo cheque y marca el cheque emitido', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision());

    expect(movimiento).toMatchObject({
      cuentaBancariaId: CUENTA,
      tipo: 'cheque',
      monto: '100.00',
      beneficiario: 'Proveedor S.A.',
    });
    expect(await casos.movimientos.saldoDe(CUENTA)).toBe('900.00');
    const siguiente = await casos.siguiente.ejecutar(operador, CUENTA);
    expect(siguiente?.numero).toBe(2);
  });

  it('usa "Cheque <número>" como referencia si no se escribió una', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision({ referencia: null }));

    expect(movimiento.referencia).toBe('Cheque 1');
  });

  it('exige el beneficiario', async () => {
    await expect(casos.emitir.ejecutar(operador, emision({ beneficiario: '  ' }))).rejects.toThrow(
      BeneficiarioObligatorio,
    );
  });

  it('no se emite un cheque que ya no está disponible', async () => {
    await casos.emitir.ejecutar(operador, emision());

    await expect(casos.emitir.ejecutar(operador, emision())).rejects.toThrow(ChequeNoDisponible);
  });

  it('revisa el sobregiro de la cuenta', async () => {
    await expect(casos.emitir.ejecutar(operador, emision({ monto: '1000.01' }))).rejects.toThrow(SaldoInsuficiente);
  });

  it('un movimiento de cheque no se corrige ni se anula suelto', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision());

    await expect(
      casos.actualizarMovimiento.ejecutar(operador, {
        movimientoId: movimiento.id,
        solicitud: {
          cuentaBancariaId: CUENTA,
          tipo: 'debito',
          fecha: '2026-02-01',
          monto: '100.00',
          saldoInicial: false,
          referencia: null,
          beneficiario: null,
          observaciones: null,
          conceptoId: CONCEPTO_GENERAL,
        },
        esSaldoInicial: false,
      }),
    ).rejects.toThrow(MovimientoDeCheque);
    await expect(
      casos.anularMovimiento.ejecutar(operador, { movimientoId: movimiento.id, motivo: 'Error' }),
    ).rejects.toThrow(MovimientoDeCheque);
  });
});

describe('listar (de la empresa)', () => {
  it('no incluye los cheques disponibles', async () => {
    const listado = await casos.listar.ejecutar(operador, {});

    expect(listado).toHaveLength(0);
  });

  it('trae los emitidos con los datos de su movimiento', async () => {
    await casos.emitir.ejecutar(operador, emision());

    const listado = await casos.listar.ejecutar(operador, {});

    expect(listado).toMatchObject([
      { numero: 1, estado: 'emitido', monto: '100.00', beneficiario: 'Proveedor S.A.', cuentaBancariaId: CUENTA },
    ]);
  });

  it('trae los anulados sin haberse emitido, con la fecha de su anulación', async () => {
    await casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Roto' });

    const listado = await casos.listar.ejecutar(operador, {});

    expect(listado).toMatchObject([{ numero: 1, estado: 'anulado', monto: null, beneficiario: null }]);
    expect(listado[0]?.fecha).toEqual(expect.any(String));
  });

  it('filtra por estado y por cuenta', async () => {
    await casos.emitir.ejecutar(operador, emision());

    expect(await casos.listar.ejecutar(operador, { estado: 'anulado' })).toHaveLength(0);
    expect(await casos.listar.ejecutar(operador, { cuentaBancariaId: CUENTA })).toHaveLength(1);
    expect(await casos.listar.ejecutar(operador, { cuentaBancariaId: randomUUID() })).toHaveLength(0);
  });
});
