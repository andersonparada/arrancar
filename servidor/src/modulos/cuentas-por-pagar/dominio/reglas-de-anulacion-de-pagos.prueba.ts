import { describe, expect, it } from 'vitest';
import { PagoCobrado } from './errores-de-anulacion-de-pagos.js';
import type { PagoConLineas } from './pago-con-lineas.js';
import {
  noEstarCobrado,
  REGLAS_PARA_ANULAR_PAGO,
  REGLAS_PARA_REAPLICAR_PAGO,
  revisarReglasDePago,
} from './reglas-de-anulacion-de-pagos.js';

const pago = { numero: 7, anioDeNumero: 2026 } as PagoConLineas;

describe('las reglas de anular y reaplicar un pago', () => {
  it('un cheque conciliado no se anula y el mensaje ofrece reaplicar o el reintegro', () => {
    expect(() => noEstarCobrado({ pago, conciliado: true })).toThrow(PagoCobrado);
    expect(() => noEstarCobrado({ pago, conciliado: true })).toThrow(/2026-7.*reaplíquelo.*reintegro/);
    noEstarCobrado({ pago, conciliado: false });
  });

  it('anular corre noEstarCobrado y reaplicar no tiene reglas todavía', async () => {
    await expect(revisarReglasDePago(REGLAS_PARA_ANULAR_PAGO, { pago, conciliado: true })).rejects.toThrow(PagoCobrado);
    await revisarReglasDePago(REGLAS_PARA_REAPLICAR_PAGO, { pago, conciliado: true });
  });
});
