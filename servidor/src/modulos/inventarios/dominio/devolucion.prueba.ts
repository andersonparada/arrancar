import { describe, expect, it } from 'vitest';
import {
  DevolucionAntesDeLaEntrada,
  DevolucionMayorQueLaEntrada,
  LineaSobrerrecibida,
  LineaDescartada,
  LineaNoRecibible,
  NotaNoCorrespondeALasEntradas,
} from './errores-de-recepcion.js';
import { DocumentoInvalido } from './errores-de-kardex.js';
import type { LineaDeCompra } from './linea-de-compra.js';
import type { RenglonDePlan } from './plan-de-documento.js';
import { planDeDevolucion, type EntradaDevolvible, type RenglonDevuelto } from './devolucion.js';

const nota = (cambios: Partial<LineaDeCompra> = {}): LineaDeCompra => ({
  lineaId: 'ln1',
  documentoId: 'nc1',
  tipoDeDocumento: 'nota_de_credito',
  documentoVigente: true,
  documentoAfectadoId: 'f1',
  documento: 'N-1',
  numeroDeLinea: 1,
  fechaEmision: '2026-09-20',
  esInventario: false,
  costoCentavos: 5_000n,
  aplicadoCentavos: 0n,
  descartada: false,
  ...cambios,
});

const entrada = (cambios: Partial<EntradaDevolvible> = {}): EntradaDevolvible => ({
  movimientoId: 'e1',
  articuloId: 'a1',
  bodegaId: 'b1',
  loteId: null,
  documentoId: 'r1',
  documentoDeCompraId: 'f1',
  fecha: '2026-09-10',
  cantidad: 100_0000n,
  costoCentavos: 1_000n,
  devuelta: 0n,
  ...cambios,
});

const devuelto = (e: EntradaDevolvible, cantidad: bigint): RenglonDevuelto => {
  const renglon: RenglonDePlan = {
    articuloId: e.articuloId,
    loteId: e.loteId,
    cantidad,
    cantidadEscrita: cantidad,
    unidadEscritaId: 'lb',
    costoTotal: 0n,
  };
  return { entrada: e, renglon };
};

const devolver = (renglones: RenglonDevuelto[], laNota = nota()) =>
  planDeDevolucion({ fecha: '2026-09-21', nota: laNota, observaciones: null, renglones });

describe('plan de una devolución a proveedor', () => {
  it('sale de la bodega de la entrada, ligada a su nota y a la entrada que devuelve', () => {
    const e = entrada();

    const plan = devolver([devuelto(e, 10_0000n)]);

    expect(plan).toMatchObject({
      clase: 'devolucion_a_proveedor',
      bodegaId: 'b1',
      documentoDeCompraId: 'nc1',
      documentoRelacionadoId: 'r1',
    });
    expect(plan.renglones[0]).toMatchObject({ lineaDeCompraId: 'ln1', movimientoDeOrigenId: 'e1', costoTotal: 0n });
  });

  it('no relaciona una sola recepción cuando las entradas son de varias', () => {
    const plan = devolver([
      devuelto(entrada(), 1_0000n),
      devuelto(entrada({ movimientoId: 'e2', documentoId: 'r2' }), 1_0000n),
    ]);

    expect(plan.documentoRelacionadoId).toBeNull();
  });

  it('no deja devolver más de lo que queda de la entrada, sumando los renglones que la repiten', () => {
    const e = entrada({ devuelta: 70_0000n });

    expect(() => devolver([devuelto(e, 30_0000n)])).not.toThrow();
    expect(() => devolver([devuelto(e, 30_0001n)])).toThrow(DevolucionMayorQueLaEntrada);
    expect(() => devolver([devuelto(e, 20_0000n), devuelto(e, 10_0001n)])).toThrow(DevolucionMayorQueLaEntrada);
  });

  it('exige que la nota corrija la factura de las entradas y que sea de una sola bodega', () => {
    expect(() => devolver([devuelto(entrada({ documentoDeCompraId: 'otra' }), 1_0000n)])).toThrow(
      NotaNoCorrespondeALasEntradas,
    );
    expect(() =>
      devolver([devuelto(entrada(), 1_0000n), devuelto(entrada({ movimientoId: 'e2', bodegaId: 'b2' }), 1_0000n)]),
    ).toThrow(NotaNoCorrespondeALasEntradas);
  });

  it('exige una línea de nota de crédito vigente, de una factura del libro y sin descartar', () => {
    const e = devuelto(entrada(), 1_0000n);

    expect(() => devolver([e], nota({ documentoVigente: false }))).toThrow(LineaNoRecibible);
    expect(() => devolver([e], nota({ tipoDeDocumento: 'factura' }))).toThrow(LineaNoRecibible);
    expect(() => devolver([e], nota({ documentoAfectadoId: null }))).toThrow(LineaNoRecibible);
    expect(() => devolver([e], nota({ descartada: true }))).toThrow(LineaDescartada);
  });

  it('exige renglones con cantidad mayor que cero', () => {
    expect(() => devolver([])).toThrow(DocumentoInvalido);
    expect(() => devolver([devuelto(entrada(), 0n)])).toThrow(DocumentoInvalido);
  });

  it('rechaza una fecha anterior a la de la entrada', () => {
    const e = entrada({ fecha: '2026-09-22' });

    expect(() => devolver([devuelto(e, 10_0000n)])).toThrow(DevolucionAntesDeLaEntrada);
  });

  it('rechaza un costo que pasa de lo que falta de la línea de la nota', () => {
    const e = entrada({ costoCentavos: 10_000n });

    expect(() => devolver([devuelto(e, 60_0000n)])).toThrow(LineaSobrerrecibida);
    expect(() => devolver([devuelto(e, 50_0000n)])).not.toThrow();
    expect(() => devolver([devuelto(e, 10_0000n)], nota({ aplicadoCentavos: 4_500n }))).toThrow(LineaSobrerrecibida);
  });
});
