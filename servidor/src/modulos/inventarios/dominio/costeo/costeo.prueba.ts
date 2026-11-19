import { describe, expect, it } from 'vitest';
import { verificarCantidadesPorClave } from './cantidades-por-clave.js';
import { diferenciasDeCosto } from './diferencias.js';
import { ExistenciaNegativa } from './errores.js';
import { dividirRedondeado } from './escalas.js';
import { ordenarKardex } from './orden.js';
import { recalcularPeps } from './peps.js';
import { recalcularPromedio } from './promedio.js';
import type { MovimientoDeCosto } from './tipos.js';

/** Libras a diezmilésimas. */
const lb = (n: number): bigint => BigInt(n) * 10_000n;

function mov(m: Partial<MovimientoDeCosto> & Pick<MovimientoDeCosto, 'id' | 'tipo' | 'cantidad'>) {
  return { valor: 0n, fecha: '2026-01-01', secuencia: 0, ...m } satisfies MovimientoDeCosto;
}

const e1 = mov({ id: 'e1', tipo: 'entrada', cantidad: lb(100), valor: 20_000n, fecha: '2026-01-01', secuencia: 1 }); // 100 lb a Q2.00
const e2 = mov({ id: 'e2', tipo: 'entrada', cantidad: lb(50), valor: 11_500n, fecha: '2026-01-01', secuencia: 2 }); // 50 lb a Q2.30

describe('redondeo', () => {
  it('la mitad sube y nunca usa coma flotante', () => {
    expect(dividirRedondeado(5n, 2n)).toBe(3n);
    expect(dividirRedondeado(4n, 3n)).toBe(1n);
    expect(dividirRedondeado(-5n, 2n)).toBe(-3n);
  });
});

describe('orden del kardex', () => {
  it('dentro del día van primero las entradas, luego valores y al final las salidas', () => {
    const lista = [
      mov({ id: 's', tipo: 'salida', cantidad: 1n, valor: 0n, fecha: '2026-01-02', secuencia: 1 }),
      mov({ id: 'v', tipo: 'valor', cantidad: 0n, valor: 1n, fecha: '2026-01-02', secuencia: 2 }),
      mov({ id: 'e', tipo: 'entrada', cantidad: 1n, valor: 1n, fecha: '2026-01-02', secuencia: 3 }),
      mov({ id: 'a', tipo: 'entrada', cantidad: 1n, valor: 1n, fecha: '2026-01-01', secuencia: 9 }),
    ];
    expect(ordenarKardex(lista).map((m) => m.id)).toEqual(['a', 'e', 'v', 's']);
  });
});

describe('promedio ponderado móvil (§7.6)', () => {
  it('calcula el promedio, la salida parcial y la que vacía con el residuo', () => {
    const { resultados, estado } = recalcularPromedio([
      e1,
      e2,
      mov({ id: 's1', tipo: 'salida', cantidad: lb(40), valor: 0n, fecha: '2026-01-02', secuencia: 3 }),
      mov({ id: 's2', tipo: 'salida', cantidad: lb(110), valor: 0n, fecha: '2026-01-03', secuencia: 4 }),
    ]);
    expect(resultados[1]).toMatchObject({ saldoCantidad: lb(150), saldoValor: 31_500n });
    expect(resultados[2]).toMatchObject({ costo: 8_400n, saldoCantidad: lb(110), saldoValor: 23_100n });
    expect(resultados[3]?.costo).toBe(23_100n);
    expect(estado).toEqual({ cantidad: 0n, valor: 0n });
  });

  it('recalcula la salida cuando entra una compra anterior del mismo día', () => {
    const salida = mov({ id: 's1', tipo: 'salida', cantidad: lb(40), valor: 0n, fecha: '2026-01-01', secuencia: 3 });
    const antes = recalcularPromedio([e1, e2, salida]);
    const despues = recalcularPromedio([
      e1,
      e2,
      salida,
      mov({ id: 'e3', tipo: 'entrada', cantidad: lb(100), valor: 26_000n, fecha: '2026-01-01', secuencia: 4 }),
    ]);
    const nuevo = despues.resultados.find((r) => r.id === 's1');
    expect(nuevo?.costo).toBe(9_200n);
    const previos = new Map(antes.resultados.map((r) => [r.id, r.costo]));
    expect(diferenciasDeCosto(previos, despues.resultados, new Set(['s1']))).toEqual([
      { movimientoId: 's1', diferenciaCentavos: 800n },
    ]);
  });

  it('parte desde el saldo anterior al movimiento insertado', () => {
    const { resultados } = recalcularPromedio(
      [mov({ id: 's', tipo: 'salida', cantidad: lb(10), valor: 0n, fecha: '2026-02-01', secuencia: 1 })],
      {
        cantidad: lb(150),
        valor: 31_500n,
      },
    );
    expect(resultados[0]?.costo).toBe(2_100n);
  });

  it('un movimiento de valor sube el valor sin cambiar la cantidad', () => {
    const { estado } = recalcularPromedio([
      e1,
      mov({ id: 'm', tipo: 'valor', cantidad: 0n, valor: 500n, fecha: '2026-01-02', secuencia: 2 }),
    ]);
    expect(estado).toEqual({ cantidad: lb(100), valor: 20_500n });
  });

  it('rechaza una salida con fecha anterior a la única entrada aunque hoy haya existencia', () => {
    const entrada = mov({
      id: 'e',
      tipo: 'entrada',
      cantidad: lb(100),
      valor: 20_000n,
      fecha: '2026-01-10',
      secuencia: 1,
    });
    const salida = mov({ id: 's', tipo: 'salida', cantidad: lb(10), valor: 0n, fecha: '2026-01-05', secuencia: 2 });
    expect(() => recalcularPromedio([entrada, salida])).toThrow(ExistenciaNegativa);
  });

  it('rechaza una existencia negativa en cualquier punto de la línea del tiempo', () => {
    const lista = [
      e1,
      mov({ id: 's1', tipo: 'salida', cantidad: lb(90), valor: 0n, fecha: '2026-01-02', secuencia: 2 }),
      mov({ id: 's2', tipo: 'salida', cantidad: lb(20), valor: 0n, fecha: '2026-01-03', secuencia: 3 }),
    ];
    expect(() => recalcularPromedio(lista)).toThrow(/negativa el 2026-01-03/);
  });
});

describe('PEPS (§7.6)', () => {
  it('consume la capa más antigua y luego la proporción de la siguiente', () => {
    const { resultados, estado } = recalcularPeps([
      e1,
      e2,
      mov({ id: 's', tipo: 'salida', cantidad: lb(120), valor: 0n, fecha: '2026-01-02', secuencia: 3 }),
    ]);
    expect(resultados[2]?.costo).toBe(24_600n);
    expect(resultados[2]?.consumos.map((c) => c.valor)).toEqual([20_000n, 4_600n]);
    expect(estado.map((c) => [c.cantidadRestante, c.valorRestante])).toEqual([
      [0n, 0n],
      [lb(30), 6_900n],
    ]);
  });

  it('recalcula desde las capas previas (deshace los consumos)', () => {
    const primera = recalcularPeps([e1, e2]).estado;
    const salida = mov({ id: 's', tipo: 'salida', cantidad: lb(120), valor: 0n, fecha: '2026-01-02', secuencia: 3 });
    const nueva = recalcularPeps(
      [
        salida,
        mov({ id: 'e3', tipo: 'entrada', cantidad: lb(100), valor: 26_000n, fecha: '2026-01-02', secuencia: 4 }),
      ],
      primera,
    );
    expect(nueva.resultados.find((r) => r.id === 's')?.costo).toBe(24_600n);
    expect(nueva.resultados.at(-1)?.saldoCantidad).toBe(lb(130));
  });

  it('una entrada con fecha anterior pasa adelante de las capas existentes', () => {
    const vieja = mov({ id: 'v', tipo: 'entrada', cantidad: lb(10), valor: 1_000n, fecha: '2025-12-31', secuencia: 9 });
    const { resultados } = recalcularPeps([
      e1,
      vieja,
      mov({ id: 's', tipo: 'salida', cantidad: lb(10), valor: 0n, fecha: '2026-01-02', secuencia: 3 }),
    ]);
    expect(resultados.at(-1)?.costo).toBe(1_000n);
  });

  it('un movimiento de valor sube la capa elegida', () => {
    const { estado } = recalcularPeps([
      e1,
      {
        ...mov({ id: 'm', tipo: 'valor', cantidad: 0n, valor: 300n, fecha: '2026-01-02', secuencia: 2 }),
        capaId: 'e1',
      },
    ]);
    expect(estado[0]?.valorRestante).toBe(20_300n);
  });

  it('rechaza el valor sobre una entrada sin existencia', () => {
    const lista = [
      e1,
      mov({ id: 's', tipo: 'salida', cantidad: lb(100), valor: 0n, fecha: '2026-01-02', secuencia: 2 }),
      {
        ...mov({ id: 'm', tipo: 'valor', cantidad: 0n, valor: 300n, fecha: '2026-01-03', secuencia: 3 }),
        capaId: 'e1',
      },
    ];
    expect(() => recalcularPeps(lista)).toThrow(/ya no tiene existencia/);
  });

  it('rechaza la salida que no alcanza', () => {
    expect(() =>
      recalcularPeps([
        e1,
        mov({ id: 's', tipo: 'salida', cantidad: lb(101), valor: 0n, fecha: '2026-01-02', secuencia: 2 }),
      ]),
    ).toThrow(ExistenciaNegativa);
  });
});

describe('existencias por bodega y lote', () => {
  const entradaA = {
    ...mov({ id: 'e', tipo: 'entrada', cantidad: lb(10), valor: 0n, fecha: '2026-01-10', secuencia: 1 }),
    clave: 'A|-',
  };

  it('rechaza una salida anterior a la entrada de su bodega aunque otra bodega tuviera existencia', () => {
    const otra = {
      ...mov({ id: 'o', tipo: 'entrada', cantidad: lb(10), valor: 0n, fecha: '2026-01-01', secuencia: 2 }),
      clave: 'B|-',
    };
    const salida = {
      ...mov({ id: 's', tipo: 'salida', cantidad: lb(5), valor: 0n, fecha: '2026-01-05', secuencia: 3 }),
      clave: 'A|-',
    };
    expect(() => verificarCantidadesPorClave([entradaA, otra, salida])).toThrow(ExistenciaNegativa);
  });

  it('acepta cuando cada bodega alcanza', () => {
    const salida = {
      ...mov({ id: 's', tipo: 'salida', cantidad: lb(5), valor: 0n, fecha: '2026-01-11', secuencia: 3 }),
      clave: 'A|-',
    };
    expect(() => verificarCantidadesPorClave([entradaA, salida])).not.toThrow();
  });
});
