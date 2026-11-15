import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { FichaDelDocumento } from '../servicios/tipos';
import {
  avisoDeNotasPosteriores,
  avisoDelCuadreConNotas,
  ayudaDeFacturaAnterior,
  detallesDeFacturaAnterior,
  hayNotasPosteriores,
  textoDeFacturaAnterior,
} from './notas-del-sistema-anterior';

beforeEach(() => setActivePinia(createPinia()));

const nota = (cambios: Partial<FichaDelDocumento>) =>
  ({
    facturaDelSistemaAnterior: true,
    documentoAfectadoId: null,
    clase: 'abono',
    facturaAnterior: null,
    ...cambios,
  }) as FichaDelDocumento;

describe('notas posteriores de un saldo inicial', () => {
  it('sin notas no hay aviso', () => {
    const cero = { notasDeCredito: 0, saldoLibre: '0.00', notasDeDebito: 0 };
    expect(hayNotasPosteriores(cero)).toBe(false);
    expect(avisoDeNotasPosteriores(cero)).toBe('');
    expect(avisoDeNotasPosteriores(undefined)).toBe('');
  });

  it('dice cuántas notas de crédito hay, cuánto dejan y dónde aplicarlas', () => {
    const aviso = avisoDeNotasPosteriores({ notasDeCredito: 2, saldoLibre: '150.00', notasDeDebito: 0 });
    expect(aviso).toMatch(/2 notas de crédito posteriores/);
    expect(aviso).toMatch(/150/);
    expect(aviso).toMatch(/Notas de crédito/);
  });

  it('usa el singular y suma las de débito', () => {
    const aviso = avisoDeNotasPosteriores({ notasDeCredito: 1, saldoLibre: '10.00', notasDeDebito: 3 });
    expect(aviso).toMatch(/1 nota de crédito posterior/);
    expect(aviso).toMatch(/También hay 3 notas de débito .* cargo sin factura/);
  });

  it('solo de débito empieza con «Hay»', () => {
    expect(avisoDeNotasPosteriores({ notasDeCredito: 0, saldoLibre: '0.00', notasDeDebito: 1 })).toMatch(
      /^Hay 1 nota de débito/,
    );
  });
});

describe('cuadre con notas posteriores', () => {
  it('avisa cuántos saldos y calla si ninguno', () => {
    expect(avisoDelCuadreConNotas(0)).toBe('');
    expect(avisoDelCuadreConNotas(1)).toMatch(/^1 saldo inicial tiene/);
    expect(avisoDelCuadreConNotas(4)).toMatch(/^4 saldos iniciales tienen/);
  });
});

describe('ficha de una nota sobre una factura anterior', () => {
  it('distingue la que corrige un saldo inicial de la que no tiene', () => {
    expect(textoDeFacturaAnterior(nota({ documentoAfectadoId: 'x' }))).toMatch(/saldo inicial de una factura/);
    expect(textoDeFacturaAnterior(nota({}))).toMatch(/no tiene saldo inicial/);
    expect(textoDeFacturaAnterior(nota({ facturaDelSistemaAnterior: false }))).toBe('');
  });

  it('muestra los datos de la factura citada y qué hacer', () => {
    const suelta = nota({ facturaAnterior: { tipo: 'factura', serie: 'A', numero: '9', fechaEmision: '2026-09-30' } });
    expect(detallesDeFacturaAnterior(suelta).map((d) => d.valor)[0]).toBe('Factura A-9');
    expect(ayudaDeFacturaAnterior(suelta)).toMatch(/Saldos iniciales/);
    expect(ayudaDeFacturaAnterior(nota({ clase: 'cargo' }))).toMatch(/cargo sin factura/);
    expect(ayudaDeFacturaAnterior(nota({ documentoAfectadoId: 'x' }))).toBe('');
    expect(detallesDeFacturaAnterior(nota({}))).toEqual([]);
  });
});
