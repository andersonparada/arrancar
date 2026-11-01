import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DocumentoPorPagar } from '../servicios/tipos';
import {
  documentosACompletar,
  erroresDeCompletar,
  resumenDeCompletar,
  vencimientosIniciales,
} from './completar-bandeja';
import {
  alternarSeleccion,
  avisoDeLote,
  conservarSeleccion,
  estaTodoSeleccionado,
  MAXIMO_POR_LOTE,
  seleccionarTodos,
} from './seleccion-de-documentos';

const documento = (cambios: Partial<DocumentoPorPagar>): DocumentoPorPagar =>
  ({
    id: 'a',
    clase: 'cargo',
    fechaEmision: '2026-10-01',
    vencimiento: '2026-11-01',
    ...cambios,
  }) as DocumentoPorPagar;

// Los mensajes dan formato a las fechas con la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

describe('vencimientos de la bandeja', () => {
  it('parten del propuesto al recibir, solo en los cargos', () => {
    const documentos = [documento({ id: 'f' }), documento({ id: 'n', clase: 'abono', vencimiento: null })];
    expect(vencimientosIniciales(documentos)).toEqual({ f: '2026-11-01' });
  });

  it('un cargo sin propuesta queda vacío para que se escriba', () => {
    expect(vencimientosIniciales([documento({ id: 'f', vencimiento: null })])).toEqual({ f: '' });
  });
});

describe('errores antes de completar', () => {
  it('pide la fecha cuando falta', () => {
    expect(erroresDeCompletar([documento({ id: 'f' })], { f: '' })).toEqual({ f: 'Escriba la fecha de vencimiento.' });
  });

  it('no deja vencer antes de la emisión', () => {
    const errores = erroresDeCompletar([documento({ id: 'f' })], { f: '2026-09-30' });
    expect(errores.f).toContain('anterior a la emisión');
  });

  it('acepta el mismo día de la emisión y no revisa las notas de crédito', () => {
    const notas = [documento({ id: 'f' }), documento({ id: 'n', clase: 'abono' })];
    expect(erroresDeCompletar(notas, { f: '2026-10-01' })).toEqual({});
  });
});

describe('cuerpo de completar', () => {
  it('manda el vencimiento de los cargos y nada para las notas de crédito', () => {
    const escogidos = [documento({ id: 'f' }), documento({ id: 'n', clase: 'abono', vencimiento: null })];
    expect(documentosACompletar(escogidos, { f: '2026-12-15' })).toEqual([
      { id: 'f', vencimiento: '2026-12-15' },
      { id: 'n' },
    ]);
  });
});

describe('resumen de completar', () => {
  it('habla en singular con uno y en plural con varios', () => {
    expect(resumenDeCompletar([documento({})])).toContain('el documento escogido');
    expect(resumenDeCompletar([documento({}), documento({ id: 'b' })])).toContain('los 2 documentos escogidos');
  });
});

describe('selección por lotes', () => {
  const ids = Array.from({ length: 130 }, (_, numero) => `d${numero}`);

  it('marca y desmarca un documento', () => {
    expect(alternarSeleccion([], 'a')).toEqual(['a']);
    expect(alternarSeleccion(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('no deja pasar del máximo del lote al marcar de uno en uno', () => {
    const llena = seleccionarTodos(ids);
    expect(llena).toHaveLength(MAXIMO_POR_LOTE);
    expect(alternarSeleccion(llena, 'd120')).toHaveLength(MAXIMO_POR_LOTE);
  });

  it('seleccionar todos toma los primeros del lote', () => {
    expect(seleccionarTodos(['a', 'b'])).toEqual(['a', 'b']);
    expect(seleccionarTodos(ids)[99]).toBe('d99');
  });

  it('conserva solo lo que sigue disponible', () => {
    expect(conservarSeleccion(['a', 'b', 'c'], ['b', 'c', 'd'])).toEqual(['b', 'c']);
  });

  it('sabe cuándo está todo marcado, también con más de un lote', () => {
    expect(estaTodoSeleccionado([], [])).toBe(false);
    expect(estaTodoSeleccionado(['a'], ['a', 'b'])).toBe(false);
    expect(estaTodoSeleccionado(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(estaTodoSeleccionado(seleccionarTodos(ids), ids)).toBe(true);
  });

  it('avisa del lote solo cuando hay más de los que caben', () => {
    expect(avisoDeLote(100)).toBe('');
    expect(avisoDeLote(101)).toContain('de 100 en 100');
  });
});
