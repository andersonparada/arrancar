import { describe, expect, it } from 'vitest';
import { verificarCantidadesPorClave } from './cantidades-por-clave.js';
import { diferenciasDeReparto } from './diferencias.js';
import { recalcularPeps } from './peps.js';
import { recalcularPromedio } from './promedio.js';
import type { MovimientoDeCosto, ResultadoDeMovimiento } from './tipos.js';

const lb = (n: number): bigint => BigInt(n) * 10_000n;

function mov(m: Partial<MovimientoDeCosto> & Pick<MovimientoDeCosto, 'id' | 'tipo'>): MovimientoDeCosto {
  return { cantidad: 0n, valor: 0n, fecha: '2026-01-01', secuencia: 0, ...m };
}

type Pos = readonly [fecha: string, secuencia: number];
const entrada = (id: string, [libras, valor]: readonly [number, bigint], [fecha, secuencia]: Pos) =>
  mov({ id, tipo: 'entrada', cantidad: lb(libras), valor, fecha, secuencia });
const salida = (id: string, libras: number, [fecha, secuencia]: Pos) =>
  mov({ id, tipo: 'salida', cantidad: lb(libras), fecha, secuencia });
const flete = (id: string, [sobre, parte]: readonly [string, bigint], [fecha, secuencia]: Pos) =>
  mov({ id, tipo: 'valor', reparto: { entradaId: sobre, parte }, fecha, secuencia });

const resultadoDe = (r: { resultados: readonly ResultadoDeMovimiento[] }, id: string) =>
  r.resultados.find((x) => x.id === id);

describe('absorción con promedio: factor exacto (validación del contador §2.2)', () => {
  it('contraejemplo 1: 100 lb (A) y 900 lb (B), salen 500, flete de Q30.00 sobre A absorbe Q15.00', () => {
    const r = recalcularPromedio([
      entrada('A', [100, 20_000n], ['2026-01-01', 1]),
      entrada('B', [900, 180_000n], ['2026-01-02', 2]),
      salida('s', 500, ['2026-01-03', 3]),
      flete('f', ['A', 3_000n], ['2026-01-04', 4]),
    ]);
    expect(resultadoDe(r, 'f')).toMatchObject({ costo: 1_500n, aResultados: 1_500n });
    expect(r.estado.valor).toBe(100_000n + 1_500n);
  });

  it('contraejemplo 2: entran 100, salen 100, entran 100: absorbe 0 y todo va a resultados', () => {
    const r = recalcularPromedio([
      entrada('A', [100, 20_000n], ['2026-01-01', 1]),
      salida('s', 100, ['2026-01-02', 2]),
      entrada('B', [100, 25_000n], ['2026-01-03', 3]),
      flete('f', ['A', 3_000n], ['2026-01-04', 4]),
    ]);
    expect(resultadoDe(r, 'f')).toMatchObject({ costo: 0n, aResultados: 3_000n });
    expect(r.estado.valor).toBe(25_000n);
  });

  it('una sola entrada: después de salir 40 de 100 absorbe Q18.00 y Q12.00 a resultados', () => {
    const r = recalcularPromedio([
      entrada('A', [100, 20_000n], ['2026-01-01', 1]),
      salida('s', 40, ['2026-01-02', 2]),
      flete('f', ['A', 3_000n], ['2026-01-03', 3]),
    ]);
    expect(resultadoDe(r, 'f')).toMatchObject({ costo: 1_800n, aResultados: 1_200n });
  });

  it('las entradas posteriores al documento no cambian el factor', () => {
    const base = [
      entrada('A', [100, 20_000n], ['2026-01-01', 1]),
      salida('s', 50, ['2026-01-02', 2]),
      flete('f', ['A', 3_000n], ['2026-01-03', 3]),
    ];
    const con = recalcularPromedio([...base, entrada('B', [500, 90_000n], ['2026-01-04', 4])]);
    expect(resultadoDe(con, 'f')).toMatchObject({ costo: 1_500n });
    expect(resultadoDe(recalcularPromedio(base), 'f')).toMatchObject({ costo: 1_500n });
  });

  it('el factor es el producto de varias salidas', () => {
    const r = recalcularPromedio([
      entrada('A', [100, 20_000n], ['2026-01-01', 1]),
      salida('s1', 50, ['2026-01-02', 2]),
      entrada('B', [50, 10_000n], ['2026-01-03', 3]),
      salida('s2', 50, ['2026-01-04', 4]),
      flete('f', ['A', 4_000n], ['2026-01-05', 5]),
    ]);
    // (1 − 50/100) × (1 − 50/100) = 0.25
    expect(resultadoDe(r, 'f')).toMatchObject({ costo: 1_000n, aResultados: 3_000n });
  });

  it('el recálculo vuelve a calcular el reparto cuando cambia una salida anterior', () => {
    const resto = [
      entrada('A', [100, 20_000n], ['2026-01-01', 1]),
      entrada('B', [100, 25_000n], ['2026-01-03', 3]),
      flete('f', ['A', 3_000n], ['2026-01-04', 4]),
    ];
    const con = recalcularPromedio([...resto, salida('s', 100, ['2026-01-02', 2])]);
    const sin = recalcularPromedio(resto);
    const guardado = new Map([['f', { absorbido: 0n, aResultados: 3_000n }]]);
    expect(diferenciasDeReparto(guardado, sin.resultados)).toEqual([
      { movimientoId: 'f', diferenciaAbsorbido: 3_000n, diferenciaAResultados: -3_000n },
    ]);
    expect(diferenciasDeReparto(guardado, con.resultados)).toEqual([]);
  });

  it('una rebaja que supera el valor del artículo deja el exceso a resultados', () => {
    const r = recalcularPromedio([
      entrada('A', [10, 1_000n], ['2026-01-01', 1]),
      flete('f', ['A', -5_000n], ['2026-01-02', 2]),
    ]);
    expect(resultadoDe(r, 'f')).toMatchObject({ costo: -1_000n, aResultados: -4_000n });
    expect(r.estado.valor).toBe(0n);
  });

  it('recalcular desde un punto usa los factores del estado anterior', () => {
    const previos = [entrada('A', [100, 20_000n], ['2026-01-01', 1]), salida('s', 50, ['2026-01-02', 2])];
    const antes = recalcularPromedio(previos, undefined, ['A']);
    const r = recalcularPromedio([flete('f', ['A', 3_000n], ['2026-01-03', 3])], antes.estado);
    expect(resultadoDe(r, 'f')).toMatchObject({ costo: 1_500n, aResultados: 1_500n });
  });
});

describe('absorción con PEPS: lo que queda de la capa', () => {
  it('con la capa agotada por la salida, todo va a resultados', () => {
    const r = recalcularPeps([
      entrada('A', [100, 20_000n], ['2026-01-01', 1]),
      entrada('B', [900, 180_000n], ['2026-01-02', 2]),
      salida('s', 500, ['2026-01-03', 3]),
      flete('f', ['A', 3_000n], ['2026-01-04', 4]),
    ]);
    expect(resultadoDe(r, 'f')).toMatchObject({ costo: 0n, aResultados: 3_000n });
  });

  it('con la capa a medias absorbe la proporción que queda y suma a su valor', () => {
    const r = recalcularPeps([
      entrada('A', [100, 20_000n], ['2026-01-01', 1]),
      salida('s', 40, ['2026-01-02', 2]),
      flete('f', ['A', 3_000n], ['2026-01-03', 3]),
    ]);
    expect(resultadoDe(r, 'f')).toMatchObject({ costo: 1_800n, aResultados: 1_200n });
    expect(r.estado[0]?.valorRestante).toBe(12_000n + 1_800n);
  });
});

describe('traslados neutros (validación §2.5)', () => {
  const lineaPromedio = [
    entrada('A', [100, 20_000n], ['2026-01-01', 1]),
    entrada('B', [50, 11_500n], ['2026-01-01', 2]),
    mov({ id: 't1', tipo: 'traslado_de_salida', cantidad: lb(50), fecha: '2026-01-02', secuencia: 3 }),
    mov({ id: 't2', tipo: 'traslado_de_entrada', cantidad: lb(50), fecha: '2026-01-02', secuencia: 4 }),
  ];

  it('con promedio no cambian cantidad ni valor y su costo es informativo', () => {
    const r = recalcularPromedio(lineaPromedio);
    for (const id of ['t1', 't2']) {
      expect(resultadoDe(r, id)).toMatchObject({ saldoCantidad: lb(150), saldoValor: 31_500n, costo: 10_500n });
    }
  });

  it('con PEPS no crean ni consumen capas', () => {
    const r = recalcularPeps(lineaPromedio);
    expect(r.estado).toHaveLength(2);
    expect(resultadoDe(r, 't2')).toMatchObject({ saldoCantidad: lb(150), saldoValor: 31_500n, consumos: [] });
  });

  it('no cuentan en el factor del promedio', () => {
    const r = recalcularPromedio([...lineaPromedio, flete('f', ['A', 3_000n], ['2026-01-03', 5])]);
    expect(resultadoDe(r, 'f')).toMatchObject({ costo: 3_000n, aResultados: 0n });
  });

  it('en la línea por bodega, la entrada del traslado va antes que una salida del mismo día', () => {
    const base = { fecha: '2026-01-02', cantidad: lb(10) };
    const lista = [
      { ...base, id: 'e', tipo: 'entrada', clave: 'b1', fecha: '2026-01-01', secuencia: 1 },
      { ...base, id: 'o', tipo: 'traslado_de_salida', clave: 'b1', secuencia: 2 },
      { ...base, id: 's', tipo: 'salida', clave: 'b2', secuencia: 3 },
      { ...base, id: 'd', tipo: 'traslado_de_entrada', clave: 'b2', secuencia: 4 },
    ] as const;
    expect(() => verificarCantidadesPorClave(lista)).not.toThrow();
  });
});

describe('devolución a proveedor', () => {
  const capas = [
    entrada('A', [100, 20_000n], ['2026-01-01', 1]),
    entrada('B', [50, 11_500n], ['2026-01-01', 2]),
    salida('s', 120, ['2026-01-02', 3]),
  ];
  const devolver = (libras: number, entradaId: string) =>
    mov({
      id: 'd',
      tipo: 'salida',
      cantidad: lb(libras),
      fecha: '2026-01-03',
      secuencia: 4,
      devolucion: { entradaId, costoUnitario: entradaId === 'A' ? 2_000_000n : 2_300_000n },
    });

  it('PEPS: rebaja su propia capa, no la más antigua (20 lb de B = Q46.00)', () => {
    const r = recalcularPeps([...capas, devolver(20, 'B')]);
    expect(resultadoDe(r, 'd')).toMatchObject({ costo: 4_600n, aResultados: 0n });
    expect(r.estado.map((c) => [c.cantidadRestante, c.valorRestante])).toEqual([
      [0n, 0n],
      [lb(10), 2_300n],
    ]);
  });

  it('PEPS: si su capa queda corta, la diferencia sale al mismo costo de las capas siguientes', () => {
    const lista = [entrada('A', [100, 20_000n], ['2026-01-01', 1]), entrada('B', [50, 11_500n], ['2026-01-02', 2])];
    const r = recalcularPeps([...lista, salida('s', 90, ['2026-01-03', 3]), devolver(20, 'A')]);
    const d = resultadoDe(r, 'd');
    expect(d?.consumos.map((c) => [c.capaId, c.cantidad, c.valor])).toEqual([
      ['A', lb(10), 2_000n],
      ['B', lb(10), 2_000n],
    ]);
  });

  it('PEPS: el valor que sobra en una capa vaciada va a resultados', () => {
    const lista = [
      entrada('B', [50, 11_500n], ['2026-01-01', 1]),
      flete('f', ['B', 500n], ['2026-01-01', 2]),
      devolver(50, 'B'),
    ];
    const r = recalcularPeps(lista.map((m) => (m.id === 'd' ? { ...m, fecha: '2026-01-03' } : m)));
    expect(resultadoDe(r, 'd')).toMatchObject({ costo: 11_500n, aResultados: 500n });
    expect(r.estado[0]).toMatchObject({ cantidadRestante: 0n, valorRestante: 0n });
  });

  it('promedio: sale al costo de su entrada, no al promedio', () => {
    const r = recalcularPromedio([
      entrada('A', [100, 20_000n], ['2026-01-01', 1]),
      entrada('B', [50, 11_500n], ['2026-01-01', 2]),
      devolver(20, 'B'),
    ]);
    expect(resultadoDe(r, 'd')).toMatchObject({ costo: 4_600n, saldoCantidad: lb(130), saldoValor: 26_900n });
  });
});
