import { describe, expect, it } from 'vitest';
import type { ProveedorDelSat2237, RubroDelSat2237 } from '../../servicios/sat-2237.api';
import {
  avisoDeProveedoresSinLugar,
  etiquetaDelIva,
  ordenarPorCredito,
  resumenDeDocumentos,
  rubroSinMovimiento,
  textoDeDocumentos,
  textoDeRubrosDeLaCasilla,
  tiposDeLaOperacion,
} from './datos-del-sat-2237';

const proveedor = (nombre: string, credito: string, extra: Partial<ProveedorDelSat2237> = {}): ProveedorDelSat2237 => ({
  nit: null,
  nombre,
  cantidadDeFacturas: 1,
  cantidadDeNotasDeCredito: 0,
  cantidadDeNotasDeDebito: 0,
  base: '0.00',
  credito,
  aviso: null,
  ...extra,
});

const cero = { base: '0.00', iva: '0.00' };
const rubro = (neto = cero): RubroDelSat2237 => ({
  clave: 'bienes',
  nombre: 'Bienes',
  nota: null,
  facturas: cero,
  notasDeDebito: cero,
  notasDeCredito: cero,
  neto,
});

describe('ordenarPorCredito', () => {
  it('ordena de mayor a menor crédito y desempata por nombre', () => {
    const orden = ordenarPorCredito([
      proveedor('Zeta', '10.00'),
      proveedor('Beta', '120.50'),
      proveedor('Alfa', '10.00'),
    ]);
    expect(orden.map((p) => p.nombre)).toEqual(['Beta', 'Alfa', 'Zeta']);
  });

  it('pone al final los créditos negativos y no cambia la lista original', () => {
    const original = [proveedor('A', '-5.00'), proveedor('B', '0.00')];
    expect(ordenarPorCredito(original).map((p) => p.nombre)).toEqual(['B', 'A']);
    expect(original[0]?.nombre).toBe('A');
  });
});

describe('rubroSinMovimiento', () => {
  it('es verdadero con todo en cero', () => expect(rubroSinMovimiento(rubro())).toBe(true));
  it('es falso si el neto tiene IVA', () =>
    expect(rubroSinMovimiento(rubro({ base: '0.00', iva: '1.20' }))).toBe(false));
});

describe('textos', () => {
  it('documentos en singular y plural', () => {
    expect(textoDeDocumentos(1)).toBe('1 documento');
    expect(textoDeDocumentos(3)).toBe('3 documentos');
  });

  it('tipos de la operación', () => {
    expect(tiposDeLaOperacion({ clave: 'x', nombre: 'x', tiposDte: ['FACT', 'FPEQ'], cantidad: 1, base: '0' })).toBe(
      'FACT, FPEQ',
    );
    expect(tiposDeLaOperacion({ clave: 'x', nombre: 'x', tiposDte: [], cantidad: 1, base: '0' })).toBe('—');
  });

  it('resume los documentos de un proveedor omitiendo los que no hay', () => {
    expect(resumenDeDocumentos(proveedor('A', '1', { cantidadDeFacturas: 2, cantidadDeNotasDeCredito: 1 }))).toBe(
      '2 facturas · 1 nota de crédito',
    );
  });
});

describe('vista como en el formulario', () => {
  const casilla = { clave: 'x', nombre: 'X', ivaDeCredito: true, llenaLaSat: false, rubros: ['a', 'b'], neto: cero };

  it('nombra los rubros que suman en una casilla y pone un guion si no tiene', () => {
    const rubros = [
      { ...rubro(), clave: 'a', nombre: 'Exento y no afecto' },
      { ...rubro(), clave: 'b', nombre: 'Compras sin derecho a crédito' },
    ];

    expect(textoDeRubrosDeLaCasilla(casilla, rubros)).toBe('Exento y no afecto + Compras sin derecho a crédito');
    expect(textoDeRubrosDeLaCasilla({ ...casilla, rubros: [] }, rubros)).toBe('—');
  });

  it('dice si el IVA de la casilla es crédito o fue al costo', () => {
    expect(etiquetaDelIva(casilla)).toBe('IVA con crédito');
    expect(etiquetaDelIva({ ...casilla, ivaDeCredito: false })).toBe('IVA al costo');
  });

  it('avisa de los proveedores que no caben, y calla si caben todos', () => {
    expect(avisoDeProveedoresSinLugar(0, 10)).toBe('');
    expect(avisoDeProveedoresSinLugar(1, 10)).toContain('queda 1 proveedor');
    expect(avisoDeProveedoresSinLugar(3, 10)).toContain('quedan 3 proveedores');
  });
});
