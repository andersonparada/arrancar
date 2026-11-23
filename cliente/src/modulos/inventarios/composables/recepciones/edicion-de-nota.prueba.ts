import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Documento } from '../../servicios/documentos.api';
import type { LineaPorRecibir } from '../../servicios/recepciones.api';
import {
  datosDeDevolucion,
  datosDeRebaja,
  devolucionNueva,
  entradasDeLaFactura,
  erroresDeDevolucion,
  erroresDeRebaja,
  rebajaNueva,
  resumenDeRebaja,
} from './edicion-de-nota';

const nota = { lineaId: 'n1', numeroDeLinea: 1, documento: 'NC-5', pendiente: '80.00' } as LineaPorRecibir;

const recepcion = (datos: Partial<Documento>): Documento =>
  ({
    id: 'r1',
    clase: 'recepcion_de_compra',
    estado: 'vigente',
    fecha: '2026-11-10',
    bodegaNombre: 'Principal',
    documentoDeCompraId: 'f1',
    renglones: [
      {
        movimientoId: 'm1',
        articuloNombre: 'Concentrado',
        articuloCodigo: 'CON',
        loteCodigo: null,
        cantidad: '10.0000',
        unidadBaseNombre: 'Libra',
      },
    ],
    ...datos,
  }) as Documento;

beforeEach(() => setActivePinia(createPinia()));

describe('devolución a proveedor', () => {
  it('ofrece solo las entradas vigentes de la factura de la nota', () => {
    const entradas = entradasDeLaFactura(
      [recepcion({}), recepcion({ id: 'r2', documentoDeCompraId: 'otra' }), recepcion({ id: 'r3', estado: 'anulado' })],
      'f1',
    );
    expect(entradas.map((e) => e.movimientoId)).toEqual(['m1']);
    expect(entradasDeLaFactura([recepcion({})], null)).toEqual([]);
  });

  it('manda solo las entradas con cantidad escrita', () => {
    const entradas = entradasDeLaFactura([recepcion({})], 'f1');
    const edicion = devolucionNueva(nota, [...entradas, { ...entradas[0]!, movimientoId: 'm2' }], '2026-11-23');
    edicion.filas[0]!.devolver = '4';
    expect(datosDeDevolucion(edicion).renglones).toEqual([
      { movimientoDeEntradaId: 'm1', cantidad: '4', unidadId: null },
    ]);
  });

  it('pide al menos una cantidad y no deja devolver más de lo que entró', () => {
    const entradas = entradasDeLaFactura([recepcion({})], 'f1');
    const edicion = devolucionNueva(nota, entradas, '2026-11-23');
    expect(erroresDeDevolucion(edicion).filas).toMatch(/al menos una entrada/);
    edicion.filas[0]!.devolver = '11';
    expect(erroresDeDevolucion(edicion)['filas.0']).toMatch(/más de lo que entró/);
    edicion.filas[0]!.devolver = '10';
    expect(erroresDeDevolucion(edicion)).toEqual({});
  });
});

describe('rebaja de costo', () => {
  it('abre con todo lo que la nota puede rebajar y repartida por valor', () => {
    expect(rebajaNueva(nota, '2026-11-23')).toMatchObject({ monto: '80.00', base: 'valor', pendiente: '80.00' });
  });

  it('el monto no pasa de lo que la nota puede rebajar', () => {
    const edicion = rebajaNueva(nota, '2026-11-23');
    edicion.monto = '80.01';
    expect(erroresDeRebaja(edicion).monto).toMatch(/solo puede rebajar/);
    edicion.monto = '0';
    expect(erroresDeRebaja(edicion).monto).toMatch(/mayor que cero/);
    edicion.monto = '79.99';
    expect(erroresDeRebaja(edicion)).toEqual({});
  });

  it('manda el monto recortado y el resumen explica el reparto', () => {
    const edicion = { ...rebajaNueva(nota, '2026-11-23'), monto: ' 50.00 ', base: 'cantidad' as const };
    expect(datosDeRebaja(edicion)).toMatchObject({ monto: '50.00', base: 'cantidad', observaciones: null });
    expect(resumenDeRebaja(edicion)).toMatch(/según la cantidad.*No mueve existencias/);
  });
});
