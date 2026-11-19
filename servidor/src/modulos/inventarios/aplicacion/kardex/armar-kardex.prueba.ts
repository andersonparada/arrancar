import { describe, expect, it } from 'vitest';
import type { FilaDeKardex } from '../puertos/consultas-del-kardex.js';
import { armarKardex } from './armar-kardex.js';

const LB = 10_000n;

interface DatosDeFila {
  numero: number;
  fecha: string;
  bodega: string;
  cantidad: bigint;
  /** Los saldos guardados: los de toda la empresa. */
  saldos: { cantidad: bigint; valor: bigint };
}

const fila = ({ numero, fecha, bodega, cantidad, saldos }: DatosDeFila): FilaDeKardex => ({
  movimientoId: `m${numero}`,
  documentoId: `d${numero}`,
  clase: cantidad > 0n ? 'entrada_manual' : 'salida_por_consumo',
  numeroDeDocumento: numero,
  fecha,
  bodegaId: bodega,
  bodegaNombre: bodega,
  loteCodigo: null,
  tipo: cantidad > 0n ? 'entrada' : 'salida',
  cantidad,
  costoUnitario: 2_000_000n,
  costoTotal: (cantidad * 2n * 100n) / LB,
  saldoCantidad: saldos.cantidad,
  saldoValor: saldos.valor,
});

// Dos bodegas: b1 recibe 100 y saca 30; b2 recibe 50. Los saldos guardados son los de toda la empresa.
const deLaEmpresa = [
  fila({
    numero: 1,
    fecha: '2026-01-01',
    bodega: 'b1',
    cantidad: 100n * LB,
    saldos: { cantidad: 100n * LB, valor: 20_000n },
  }),
  fila({
    numero: 2,
    fecha: '2026-01-02',
    bodega: 'b2',
    cantidad: 50n * LB,
    saldos: { cantidad: 150n * LB, valor: 30_000n },
  }),
  fila({
    numero: 3,
    fecha: '2026-01-03',
    bodega: 'b1',
    cantidad: -30n * LB,
    saldos: { cantidad: 120n * LB, valor: 24_000n },
  }),
];
const deB1 = deLaEmpresa.filter((f) => f.bodegaId === 'b1');

describe('kardex de un artículo', () => {
  it('por bodega lleva su propio saldo y nunca el de la empresa', () => {
    const renglones = armarKardex(deB1, { porBodega: true, verCostos: true });

    expect(renglones.map((r) => r.saldoCantidad)).toEqual(['100.0000', '70.0000']);
    expect(JSON.stringify(renglones)).not.toMatch(/150\.0000|120\.0000|300\.00|240\.00/);
  });

  it('por bodega con costos, el valor es su cantidad por el costo unitario de la empresa en esa posición', () => {
    const renglones = armarKardex(deB1, { porBodega: true, verCostos: true });

    expect(renglones.map((r) => r.saldoValor)).toEqual(['200.00', '140.00']);
  });

  it('el de la empresa trae los saldos guardados', () => {
    const renglones = armarKardex(deLaEmpresa, { porBodega: false, verCostos: true });

    expect(renglones.map((r) => [r.saldoCantidad, r.saldoValor])).toEqual([
      ['100.0000', '200.00'],
      ['150.0000', '300.00'],
      ['120.0000', '240.00'],
    ]);
  });

  it('separa entradas de salidas y sin costos no manda dinero', () => {
    const renglones = armarKardex(deB1, { porBodega: true, verCostos: false });

    expect(renglones[1]).toMatchObject({
      entrada: null,
      salida: '30.0000',
      costoUnitario: null,
      costoTotal: null,
      saldoValor: null,
    });
  });

  it('el rango de fechas recorta lo que se muestra pero el saldo cuenta lo anterior', () => {
    const renglones = armarKardex(deB1, { porBodega: true, verCostos: false, desde: '2026-01-03' });

    expect(renglones.map((r) => [r.fecha, r.saldoCantidad])).toEqual([['2026-01-03', '70.0000']]);
  });
});
