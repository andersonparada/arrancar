import { describe, expect, it } from 'vitest';
import { pedidoDesdeLaRuta } from './parametros-de-la-ruta';

const ID = '0b6f2a54-8d3c-4c1e-9a77-1f2d3c4b5a69';

describe('pedido desde la ruta', () => {
  it('lee el proveedor, el corte y la vista', () => {
    expect(pedidoDesdeLaRuta({ proveedorId: ID, corte: '2026-10-31', vista: 'vencidos' })).toEqual({
      proveedorId: ID,
      corte: '2026-10-31',
      vista: 'vencidos',
    });
  });

  it('descarta lo que no sirve en vez de fiarse del enlace', () => {
    expect(pedidoDesdeLaRuta({ proveedorId: 'no-es-id', corte: '31/10/2026', vista: 'otra' })).toEqual({
      proveedorId: '',
      corte: '',
      vista: '',
    });
    expect(pedidoDesdeLaRuta({ proveedorId: [ID, ID] })).toMatchObject({ proveedorId: '' });
    expect(pedidoDesdeLaRuta({})).toEqual({ proveedorId: '', corte: '', vista: '' });
  });
});
