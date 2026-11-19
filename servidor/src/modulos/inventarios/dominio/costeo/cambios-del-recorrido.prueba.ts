import { describe, expect, it } from 'vitest';
import { cambiosDelRecorrido, capasDelRecorrido, saldoDelRecorrido } from './cambios-del-recorrido.js';
import { diferenciasDeSalidas } from './diferencias-de-salidas.js';
import { aMovimientoDeCantidad, aMovimientoDeCosto, type MovimientoDelKardex } from './movimientos-del-kardex.js';
import { recalcularPeps } from './peps.js';
import { recalcularPromedio } from './promedio.js';
import { verificarCantidadesPorClave } from './cantidades-por-clave.js';
import { ExistenciaNegativa } from './errores.js';

const base = {
  documentoId: 'd',
  articuloId: 'a',
  bodegaId: 'b1',
  loteId: null,
  montoAResultados: 0n,
} as const;

interface Datos {
  id: string;
  fecha: string;
  secuencia: number;
  /** Diezmilésimas de libra. */
  cantidad: bigint;
  /** Centavos. */
  costo?: bigint;
}

/** Entrada de `cantidad` lb y `costo` centavos, con saldos que aún no son los definitivos. */
const entrada = ({ id, fecha, secuencia, cantidad, costo = 0n }: Datos): MovimientoDelKardex => ({
  ...base,
  id,
  fecha,
  secuencia,
  tipo: 'entrada',
  cantidad,
  costoTotal: costo,
  costoUnitario: 0n,
  costoDelMetodo: false,
  saldoCantidad: 0n,
  saldoValor: 0n,
});

const salida = (datos: Datos): MovimientoDelKardex => ({
  ...entrada({ ...datos, cantidad: -datos.cantidad, costo: 0n }),
  tipo: 'salida',
  costoDelMetodo: true,
});

const LB = 10_000n;
const guardados = [
  entrada({ id: 'e1', fecha: '2026-01-05', secuencia: 1, cantidad: 100n * LB, costo: 20_000n }),
  entrada({ id: 'e2', fecha: '2026-01-06', secuencia: 2, cantidad: 50n * LB, costo: 11_500n }),
  salida({ id: 's1', fecha: '2026-01-10', secuencia: 3, cantidad: 40n * LB }),
];

describe('lo que cambia al recalcular', () => {
  it('con promedio, las salidas toman el costo del método, el unitario de 6 decimales y todos los saldos', () => {
    const { resultados } = recalcularPromedio(guardados.map(aMovimientoDeCosto));

    const cambios = cambiosDelRecorrido(guardados, resultados);

    expect(cambios.find((c) => c.id === 's1')).toMatchObject({
      costoTotal: -8_400n,
      costoUnitario: 2_100_000n,
      saldoCantidad: 110n * LB,
      saldoValor: 23_100n,
    });
    expect(cambios.find((c) => c.id === 'e1')).toMatchObject({ costoTotal: 20_000n, saldoValor: 20_000n });
  });

  it('solo devuelve las filas que cambian: lo que ya estaba al día no se reescribe', () => {
    const { resultados } = recalcularPromedio(guardados.map(aMovimientoDeCosto));
    const alDia = cambiosDelRecorrido(guardados, resultados).map((c): MovimientoDelKardex => {
      const original = guardados.find((m) => m.id === c.id)!;
      return { ...original, ...c };
    });

    expect(cambiosDelRecorrido(alDia, resultados)).toEqual([]);
  });

  it('las diferencias de costo ignoran las salidas nuevas y cuentan las que ya estaban', () => {
    const antes = recalcularPromedio(guardados.map(aMovimientoDeCosto));
    const alDia = guardados.map((m) => ({
      ...m,
      ...cambiosDelRecorrido(guardados, antes.resultados).find((c) => c.id === m.id),
    }));
    const conEntradaNueva = [
      ...alDia,
      entrada({ id: 'e3', fecha: '2026-01-05', secuencia: 4, cantidad: 100n * LB, costo: 26_000n }),
    ];
    const despues = recalcularPromedio(conEntradaNueva.map(aMovimientoDeCosto));

    const sinNuevas = diferenciasDeSalidas(conEntradaNueva, despues.resultados, new Set(['e3']));
    const conLaSalidaNueva = diferenciasDeSalidas(conEntradaNueva, despues.resultados, new Set(['s1']));

    expect(sinNuevas).toEqual([{ movimientoId: 's1', documentoId: 'd', fecha: '2026-01-10', diferenciaCentavos: 800 }]);
    expect(conLaSalidaNueva).toEqual([]);
  });

  it('el saldo del artículo es el del último movimiento, o cero si no hay', () => {
    const { resultados } = recalcularPromedio(guardados.map(aMovimientoDeCosto));

    expect(saldoDelRecorrido(resultados)).toEqual({
      cantidad: 110n * LB,
      valor: 23_100n,
      costoPromedio: 2_100_000n,
      ultimoMovimientoId: 's1',
    });
    expect(saldoDelRecorrido([])).toEqual({ cantidad: 0n, valor: 0n, costoPromedio: 0n, ultimoMovimientoId: null });
  });

  it('con PEPS, las capas llevan su costo de entrada y los consumos dicen de dónde salió cada salida', () => {
    const peps = recalcularPeps(guardados.map(aMovimientoDeCosto));

    const { capas, consumos } = capasDelRecorrido(guardados, peps.resultados, peps.estado);

    expect(capas.map((c) => [c.movimientoDeEntradaId, c.valorInicial, c.cantidadRestante, c.valorRestante])).toEqual([
      ['e1', 20_000n, 60n * LB, 12_000n],
      ['e2', 11_500n, 50n * LB, 11_500n],
    ]);
    expect(consumos).toEqual([
      { movimientoDeSalidaId: 's1', movimientoDeEntradaId: 'e1', cantidad: 40n * LB, valor: 8_000n },
    ]);
  });
});

describe('líneas del tiempo de cantidades', () => {
  it('una salida anterior a la entrada de su bodega falla aunque otra bodega tenga existencia', () => {
    const deOtraBodega = {
      ...entrada({ id: 'e0', fecha: '2026-01-01', secuencia: 0, cantidad: 500n * LB, costo: 1_000n }),
      bodegaId: 'b2',
    };
    const todos = [
      deOtraBodega,
      ...guardados,
      { ...salida({ id: 's2', fecha: '2026-01-02', secuencia: 9, cantidad: 1n * LB }), bodegaId: 'b1' },
    ];

    expect(() => verificarCantidadesPorClave(todos.map(aMovimientoDeCantidad))).toThrow(ExistenciaNegativa);
  });
});
