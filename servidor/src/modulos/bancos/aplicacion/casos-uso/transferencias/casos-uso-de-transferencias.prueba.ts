import { CONCEPTO_GENERAL } from '../../../pruebas/conceptos-de-prueba.js';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CuentaBancariaInactiva,
  MovimientoDeTransferencia,
  SaldoInsuficiente,
  TransferenciaALaMismaCuenta,
} from '../../../dominio/errores.js';
import { DESTINO, ORIGEN, armarEntorno, operador, solicitud } from './soporte-de-pruebas-de-transferencias.js';

let casos: Awaited<ReturnType<typeof armarEntorno>>;

beforeEach(async () => {
  casos = await armarEntorno();
});

describe('registrar', () => {
  it('crea el débito en el origen y el crédito en el destino, con la misma fecha y monto', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());

    const notas = await casos.movimientos.listar({});
    const debito = notas.find((n) => n.id === registrada.movimientoOrigenId)!;
    const credito = notas.find((n) => n.id === registrada.movimientoDestinoId)!;

    expect(debito).toMatchObject({
      cuentaBancariaId: ORIGEN,
      tipo: 'debito',
      monto: '100.00',
      fecha: '2026-01-15',
      beneficiario: 'Transferencia a Cuenta destino',
      transferenciaId: registrada.id,
    });
    expect(credito).toMatchObject({
      cuentaBancariaId: DESTINO,
      tipo: 'credito',
      monto: '100.00',
      fecha: '2026-01-15',
      beneficiario: 'Transferencia desde Cuenta origen',
      transferenciaId: registrada.id,
    });
    expect(registrada.cuentaOrigenNombre).toBe('Cuenta origen');
    expect(registrada.cuentaDestinoNombre).toBe('Cuenta destino');
  });

  it('no acepta la misma cuenta como origen y destino', async () => {
    await expect(casos.registrar.ejecutar(operador, solicitud({ cuentaDestinoId: ORIGEN }))).rejects.toThrow(
      TransferenciaALaMismaCuenta,
    );
  });

  it('no registra si alguna cuenta está inactiva', async () => {
    casos.movimientos.cuentasInactivas.add(DESTINO);

    await expect(casos.registrar.ejecutar(operador, solicitud())).rejects.toThrow(CuentaBancariaInactiva);
  });

  it('revisa el sobregiro del origen', async () => {
    await expect(casos.registrar.ejecutar(operador, solicitud({ monto: '1000.01' }))).rejects.toThrow(
      SaldoInsuficiente,
    );
  });

  it('una nota de transferencia no se corrige ni se anula suelta', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());

    await expect(
      casos.actualizarMovimiento.ejecutar(operador, {
        movimientoId: registrada.movimientoOrigenId,
        solicitud: {
          cuentaBancariaId: ORIGEN,
          tipo: 'debito',
          fecha: '2026-01-15',
          monto: '100.00',
          saldoInicial: false,
          referencia: null,
          beneficiario: null,
          observaciones: null,
          conceptoId: CONCEPTO_GENERAL,
        },
        esSaldoInicial: false,
      }),
    ).rejects.toThrow(MovimientoDeTransferencia);
    await expect(
      casos.anularMovimiento.ejecutar(operador, { movimientoId: registrada.movimientoDestinoId, motivo: 'Error' }),
    ).rejects.toThrow(MovimientoDeTransferencia);
  });
});

describe('listar', () => {
  it('de la más reciente a la más antigua, incluidas las anuladas', async () => {
    const primera = await casos.registrar.ejecutar(operador, solicitud({ fecha: '2026-01-10' }));
    const segunda = await casos.registrar.ejecutar(operador, solicitud({ fecha: '2026-01-20' }));
    await casos.anular.ejecutar(operador, { transferenciaId: primera.id, motivo: 'Error' });

    const listado = await casos.listar.ejecutar(operador, {});

    expect(listado.map((t) => t.id)).toEqual([segunda.id, primera.id]);
    expect(listado.find((t) => t.id === primera.id)?.anuladaEn).toEqual(expect.any(String));
  });

  it('la cuenta filtra si es origen o destino de la transferencia', async () => {
    await casos.registrar.ejecutar(operador, solicitud());

    expect(await casos.listar.ejecutar(operador, { cuentaBancariaId: ORIGEN })).toHaveLength(1);
    expect(await casos.listar.ejecutar(operador, { cuentaBancariaId: DESTINO })).toHaveLength(1);
    expect(await casos.listar.ejecutar(operador, { cuentaBancariaId: randomUUID() })).toHaveLength(0);
  });
});
