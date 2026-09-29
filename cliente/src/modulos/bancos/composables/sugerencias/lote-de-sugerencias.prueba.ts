import { describe, expect, it } from 'vitest';
import { MAXIMO_POR_LOTE } from '../movimientos/seleccion-de-pendientes';
import type { OpcionSugerida, SugerenciaDeMovimiento } from '../../servicios/sugerencias.api';
import { cantidadConSugerido, conSugerido, indexarSugerencias, loteDeSugerencias } from './lote-de-sugerencias';

const opcion = (conceptoId: string, conceptoNombre: string): OpcionSugerida => ({
  conceptoId,
  conceptoNombre,
  confianza: 80,
  porque: {
    base: 'mismo_beneficiario',
    casos: 4,
    ultimaFecha: '2026-08-01',
    montoMinimo: '1.00',
    montoMaximo: '2.00',
    beneficiarioParecido: null,
  },
});

const sugerencia = (movimientoId: string, sugerido: OpcionSugerida | null): SugerenciaDeMovimiento => ({
  movimientoId,
  sugerido,
  alternativas: [],
  casosComparados: 5,
});

const fila = (id: string, tipo: 'credito' | 'debito' | 'cheque', monto: string) => ({ id, tipo, monto });
const planilla = opcion('c-planilla', 'Planilla');
const comisiones = opcion('c-comisiones', 'Comisiones');

const filas = [
  fila('a', 'debito', '10.10'),
  fila('b', 'cheque', '5.20'),
  fila('c', 'credito', '3.00'),
  fila('d', 'debito', '1.00'),
];
const sugerencias = indexarSugerencias({
  sugerencias: [
    sugerencia('a', planilla),
    sugerencia('b', planilla),
    sugerencia('c', comisiones),
    sugerencia('d', null),
    { sugerido: planilla, alternativas: [], casosComparados: 1 },
  ],
});

describe('indexarSugerencias', () => {
  it('las deja por movimiento e ignora las que no traen id', () => {
    expect([...sugerencias.keys()]).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('conSugerido y cantidadConSugerido', () => {
  it('dejan solo lo que tiene sugerido, y cuentan solo entre lo marcado', () => {
    expect(conSugerido(filas, sugerencias).map((f) => f.id)).toEqual(['a', 'b', 'c']);
    expect(cantidadConSugerido(filas, new Set(['a', 'd']), sugerencias)).toBe(1);
  });
});

describe('loteDeSugerencias', () => {
  it('agrupa por concepto con sus montos en centavos exactos y ordena por nombre', () => {
    const lote = loteDeSugerencias(filas, new Set(['a', 'b', 'c']), sugerencias);

    expect(lote.asignaciones).toEqual([
      { movimientoId: 'a', conceptoId: 'c-planilla' },
      { movimientoId: 'b', conceptoId: 'c-planilla' },
      { movimientoId: 'c', conceptoId: 'c-comisiones' },
    ]);
    expect(lote.grupos).toEqual([
      {
        conceptoId: 'c-comisiones',
        conceptoNombre: 'Comisiones',
        cantidad: 1,
        montoDeEntradas: '3.00',
        montoDeSalidas: '0.00',
      },
      {
        conceptoId: 'c-planilla',
        conceptoNombre: 'Planilla',
        cantidad: 2,
        montoDeEntradas: '0.00',
        montoDeSalidas: '15.30',
      },
    ]);
    expect(lote.sinSugerencia).toBe(0);
  });

  it('deja fuera lo marcado sin sugerido y lo cuenta aparte', () => {
    const lote = loteDeSugerencias(filas, new Set(['a', 'd']), sugerencias);

    expect(lote.asignaciones.map((a) => a.movimientoId)).toEqual(['a']);
    expect(lote.sinSugerencia).toBe(1);
  });

  it('nunca pasa del tope de un lote', () => {
    const muchas = Array.from({ length: MAXIMO_POR_LOTE + 5 }, (_, i) => fila(`m${i}`, 'debito', '1.00'));
    const todas = indexarSugerencias({ sugerencias: muchas.map((f) => sugerencia(f.id, planilla)) });

    const lote = loteDeSugerencias(muchas, new Set(muchas.map((f) => f.id)), todas);

    expect(lote.asignaciones).toHaveLength(MAXIMO_POR_LOTE);
    expect(lote.sinSugerencia).toBe(5);
  });

  it('sin nada marcado, un lote vacío', () => {
    expect(loteDeSugerencias(filas, new Set(), sugerencias)).toEqual({
      asignaciones: [],
      grupos: [],
      sinSugerencia: 0,
    });
  });
});
