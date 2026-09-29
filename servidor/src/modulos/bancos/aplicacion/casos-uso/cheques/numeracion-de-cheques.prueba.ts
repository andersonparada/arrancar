import { beforeEach, describe, expect, it } from 'vitest';
import { CUENTA, armarEntorno, emisionDe, operador } from './soporte-de-pruebas-de-cheques.js';

let casos: Awaited<ReturnType<typeof armarEntorno>>;

beforeEach(async () => {
  casos = await armarEntorno();
});

describe('numeración y cheques', () => {
  it('el movimiento de un cheque no lleva número', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emisionDe(casos.chequeId));

    expect(movimiento).toMatchObject({ tipo: 'cheque', numero: null });
  });

  it('si el mes está conciliado, la nota inversa del cheque anulado sí lleva número de su tipo', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emisionDe(casos.chequeId));
    casos.movimientos.fechaConciliadaHasta = '2026-02-28';

    await casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Nunca se cobró', fecha: '2026-03-05' });

    const inverso = (await casos.movimientos.listar({ cuentaBancariaId: CUENTA })).find(
      (m) => m.revierteAId === movimiento.id,
    )!;
    expect(inverso).toMatchObject({ tipo: 'credito', numero: 1 });
  });

  it('anular un cheque a la antigua no consume números', async () => {
    await casos.emitir.ejecutar(operador, emisionDe(casos.chequeId));

    await casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Error' });

    const numeros = (await casos.movimientos.listar({ cuentaBancariaId: CUENTA })).map((m) => m.numero);
    expect(numeros.every((numero) => numero === null)).toBe(true);
  });
});
