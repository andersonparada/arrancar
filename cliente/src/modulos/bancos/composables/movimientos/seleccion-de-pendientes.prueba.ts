import { describe, expect, it } from 'vitest';
import {
  MAXIMO_POR_LOTE,
  conAlternado,
  conTodosAlternados,
  marcasVigentes,
  ordenadosPorBeneficiario,
  pendientesDeClasificar,
  resumenDeSeleccion,
  tiposDeSeleccion,
  todosMarcados,
} from './seleccion-de-pendientes';

const fila = (id: string, tipo: 'credito' | 'debito' | 'cheque', monto: string) => ({
  id,
  tipo,
  monto,
  puedeReclasificar: true,
  anuladoEn: null as string | null,
});

const filas = [fila('a', 'credito', '0.10'), fila('b', 'debito', '5.25'), fila('c', 'cheque', '10.00')];

describe('pendientesDeClasificar', () => {
  it('deja solo lo que el servidor dice que se puede clasificar y no está anulado', () => {
    const todas = [
      ...filas,
      { ...fila('inverso', 'debito', '1.00'), puedeReclasificar: false },
      { ...fila('anulada', 'cheque', '1.00'), anuladoEn: '2026-01-01T00:00:00Z' },
    ];

    expect(pendientesDeClasificar(todas).map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('marcar', () => {
  it('marca y desmarca uno sin tocar el conjunto original', () => {
    const original = new Set<string>();

    const marcado = conAlternado(original, 'a');

    expect([...marcado]).toEqual(['a']);
    expect(original.size).toBe(0);
    expect(conAlternado(marcado, 'a').size).toBe(0);
  });

  it('no deja pasar del tope de un lote, pero sí quitar', () => {
    const lleno = new Set(Array.from({ length: MAXIMO_POR_LOTE }, (_, i) => `m${i}`));

    expect(conAlternado(lleno, 'otro').size).toBe(MAXIMO_POR_LOTE);
    expect(conAlternado(lleno, 'm0').size).toBe(MAXIMO_POR_LOTE - 1);
  });

  it('marcar todo alterna: marca lo visible y, si ya estaba todo, lo desmarca', () => {
    const todos = conTodosAlternados(filas, new Set());

    expect([...todos]).toEqual(['a', 'b', 'c']);
    expect(todosMarcados(filas, todos)).toBe(true);
    expect(conTodosAlternados(filas, todos).size).toBe(0);
    expect(todosMarcados([], new Set())).toBe(false);
  });

  it('marcar todo respeta el tope de un lote', () => {
    const muchas = Array.from({ length: MAXIMO_POR_LOTE + 5 }, (_, i) => fila(`m${i}`, 'credito', '1.00'));

    expect(conTodosAlternados(muchas, new Set()).size).toBe(MAXIMO_POR_LOTE);
  });

  it('al recargar conserva solo las marcas de lo que sigue pendiente', () => {
    expect([...marcasVigentes(filas, new Set(['a', 'ya-clasificada']))]).toEqual(['a']);
  });
});

describe('resumenDeSeleccion', () => {
  it('suma entradas y salidas por separado en centavos exactos', () => {
    expect(resumenDeSeleccion(filas, new Set(['a', 'b', 'c']))).toEqual({
      cantidad: 3,
      montoDeEntradas: '0.10',
      montoDeSalidas: '15.25',
    });
  });

  it('sin marcas, todo en cero', () => {
    expect(resumenDeSeleccion(filas, new Set())).toEqual({
      cantidad: 0,
      montoDeEntradas: '0.00',
      montoDeSalidas: '0.00',
    });
  });
});

describe('tiposDeSeleccion', () => {
  it('trae los tipos distintos de lo marcado', () => {
    expect(tiposDeSeleccion(filas, new Set(['a', 'c']))).toEqual(['credito', 'cheque']);
    expect(tiposDeSeleccion(filas, new Set())).toEqual([]);
  });
});

describe('ordenadosPorBeneficiario', () => {
  it('junta los del mismo beneficiario (sin distinguir mayúsculas), por fecha, y deja al final los que no tienen', () => {
    const lista = [
      { id: '1', beneficiario: null, fecha: '2026-01-01' },
      { id: '2', beneficiario: 'Zeta', fecha: '2026-01-05' },
      { id: '3', beneficiario: 'álamo', fecha: '2026-03-01' },
      { id: '4', beneficiario: 'ÁLAMO', fecha: '2026-02-01' },
      { id: '5', beneficiario: '  ', fecha: '2026-01-02' },
    ];

    expect(ordenadosPorBeneficiario(lista).map((f) => f.id)).toEqual(['4', '3', '2', '1', '5']);
  });
});
