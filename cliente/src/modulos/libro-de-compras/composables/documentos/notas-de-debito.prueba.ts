import { describe, expect, it } from 'vitest';
import type { ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import { edicionVacia } from './edicion-de-documento';
import { CLASES_DE_CARGO, conceptoDeIntereses, proponerConceptoDeIntereses } from './notas-de-debito';

const concepto = (id: string, nombre: string, activo = true): ConceptoDeGasto => ({
  id,
  nombre,
  tipoPorOmision: 'servicio',
  esProductoAgropecuario: false,
  esActivoFijo: false,
  activo,
});

const CONCEPTOS = [
  concepto('a', 'Fertilizantes'),
  concepto('b', 'Intereses bancarios'),
  concepto('c', 'Gastos financieros'),
  concepto('d', 'Gastos Financieros viejos', false),
];

describe('nota de débito: clase de cargo', () => {
  it('ofrece las tres clases del servidor con su ayuda', () => {
    expect(CLASES_DE_CARGO.map(({ valor }) => valor)).toEqual(['precio', 'intereses', 'otros']);
    expect(CLASES_DE_CARGO.every(({ ayuda }) => ayuda.length > 0)).toBe(true);
  });

  it('prefiere el gasto financiero, luego los intereses, y no usa inactivos', () => {
    expect(conceptoDeIntereses(CONCEPTOS)?.id).toBe('c');
    expect(conceptoDeIntereses(CONCEPTOS.slice(0, 2))?.id).toBe('b');
    expect(conceptoDeIntereses([concepto('d', 'Gasto financiero', false)])).toBeUndefined();
    expect(conceptoDeIntereses([concepto('e', 'Fletes')])).toBeUndefined();
  });

  it('se reconoce sin acentos ni mayúsculas', () => {
    expect(conceptoDeIntereses([concepto('x', 'INTERÉS por mora')])?.id).toBe('x');
  });

  it('propone el concepto en la primera línea vacía y no pisa uno elegido', () => {
    const edicion = edicionVacia(new Date(2026, 9, 20));
    expect(proponerConceptoDeIntereses(edicion, CONCEPTOS)).toBe(true);
    expect(edicion.lineas[0]).toMatchObject({ conceptoId: 'c', tipo: 'servicio' });
    expect(proponerConceptoDeIntereses(edicion, CONCEPTOS)).toBe(false);
    expect(edicion.lineas[0]?.conceptoId).toBe('c');
  });

  it('sin concepto financiero no cambia nada', () => {
    const edicion = edicionVacia(new Date(2026, 9, 20));
    expect(proponerConceptoDeIntereses(edicion, [concepto('e', 'Fletes')])).toBe(false);
    expect(edicion.lineas[0]?.conceptoId).toBeNull();
  });
});
