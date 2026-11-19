import { describe, expect, it } from 'vitest';
import { cambiosDelRecorrido } from './cambios-del-recorrido.js';
import { diferenciasDeRepartos } from './diferencias-de-salidas.js';
import { CapaNoDisponible } from './errores.js';
import { aMovimientosDeCosto, type MovimientoDelKardex } from './movimientos-del-kardex.js';
import { recalcularPeps } from './peps.js';
import { recalcularPromedio } from './promedio.js';

/** Un movimiento guardado del artículo A en la bodega B; las cantidades en diezmilésimas y el dinero en centavos. */
function guardado(cambios: Partial<MovimientoDelKardex> & Pick<MovimientoDelKardex, 'id' | 'fecha' | 'tipo'>) {
  return {
    documentoId: `doc-${cambios.id}`,
    articuloId: 'A',
    bodegaId: cambios.tipo === 'valor' ? null : 'B',
    loteId: null,
    secuencia: 0,
    cantidad: 0n,
    costoTotal: 0n,
    costoUnitario: 0n,
    costoDelMetodo: false,
    saldoCantidad: 0n,
    saldoValor: 0n,
    montoAResultados: 0n,
    ...cambios,
  } satisfies MovimientoDelKardex;
}

let secuencia = 0;
const dia = (numero: number) => `2026-09-${String(numero).padStart(2, '0')}`;

/** Una entrada de `libras` a `centavos` en el día `numero` de septiembre; la secuencia sigue el orden de creación. */
const entrada = (id: string, numero: number, [libras, centavos]: [bigint, bigint]) =>
  guardado({
    id,
    fecha: dia(numero),
    secuencia: ++secuencia,
    tipo: 'entrada',
    cantidad: libras * 10_000n,
    costoTotal: centavos,
    costoUnitario: (centavos * 10_000n * 10_000n) / (libras * 10_000n),
  });

const salida = (id: string, numero: number, libras: bigint) =>
  guardado({
    id,
    fecha: dia(numero),
    secuencia: ++secuencia,
    tipo: 'salida',
    cantidad: -libras * 10_000n,
    costoDelMetodo: true,
  });

const devolucion = (id: string, numero: number, [libras, origen]: [bigint, string]) => ({
  ...salida(id, numero, libras),
  costoDelMetodo: false,
  movimientoDeOrigenId: origen,
});

/** Una rebaja que le toca `parte` centavos (negativos) a la entrada `origen`; `costoTotal` es lo ya absorbido. */
const rebaja = (id: string, numero: number, reparto: { parte: bigint; origen: string; costoTotal?: bigint }) =>
  guardado({
    id,
    fecha: dia(numero),
    secuencia: ++secuencia,
    tipo: 'valor',
    movimientoDeOrigenId: reparto.origen,
    parteDeReparto: reparto.parte,
    costoTotal: reparto.costoTotal ?? 0n,
  });

const promedio = (guardados: MovimientoDelKardex[]) => recalcularPromedio(aMovimientosDeCosto(guardados)).resultados;
const peps = (guardados: MovimientoDelKardex[]) => recalcularPeps(aMovimientosDeCosto(guardados)).resultados;
const costos = (resultados: ReturnType<typeof promedio>) => resultados.map((r) => r.costo);

describe('devoluciones a proveedor guardadas', () => {
  it('con promedio salen al costo unitario de su entrada, no al promedio del artículo', () => {
    const guardados = [
      entrada('e1', 1, [100n, 20_000n]),
      entrada('e2', 2, [100n, 23_000n]),
      devolucion('d1', 3, [10n, 'e2']),
    ];

    const resultados = promedio(guardados);

    expect(resultados[2]).toMatchObject({ costo: 2_300n, saldoCantidad: 190_0000n, saldoValor: 40_700n });
  });

  it('con PEPS rebajan su propia capa y no la más antigua: no cambian el orden de consumo', () => {
    const guardados = [
      entrada('e1', 1, [100n, 20_000n]),
      entrada('e2', 2, [100n, 23_000n]),
      devolucion('d1', 3, [10n, 'e2']),
      salida('s1', 4, 120n),
    ];

    const resultados = peps(guardados);

    expect(resultados[2]!.consumos).toEqual([{ capaId: 'e2', cantidad: 10_0000n, valor: 2_300n }]);
    expect(resultados[3]!.costo).toBe(20_000n + 4_600n);
  });

  it('el recálculo deja el costo de la devolución en su movimiento, aunque nació en cero', () => {
    const guardados = [entrada('e1', 1, [100n, 20_000n]), devolucion('d1', 3, [10n, 'e1'])];

    const cambios = cambiosDelRecorrido(guardados, promedio(guardados));

    expect(cambios.find((c) => c.id === 'd1')).toMatchObject({ costoTotal: -2_000n, saldoValor: 18_000n });
  });

  it('falla si la entrada que devuelve ya no está entre los movimientos vigentes', () => {
    expect(() => aMovimientosDeCosto([devolucion('d1', 3, [10n, 'perdida'])])).toThrow(CapaNoDisponible);
  });
});

describe('repartos (rebajas) guardados', () => {
  const base = () => [entrada('e1', 1, [100n, 20_000n]), salida('s1', 2, 40n)];

  it('con promedio, la rebaja absorbe solo la fracción que sigue en existencia y el resto va a resultados', () => {
    const guardados = [...base(), rebaja('r1', 3, { parte: -3_000n, origen: 'e1' })];

    const resultados = promedio(guardados);

    expect(resultados[2]).toMatchObject({ costo: -1_800n, aResultados: -1_200n, saldoValor: 10_200n });
  });

  it('con PEPS da lo mismo en este caso: la capa conserva el 60 %', () => {
    const guardados = [...base(), rebaja('r1', 3, { parte: -3_000n, origen: 'e1' })];

    const resultados = peps(guardados);

    expect(resultados[2]).toMatchObject({ costo: -1_800n, aResultados: -1_200n, saldoValor: 10_200n });
  });

  it('el recálculo guarda lo absorbido en el movimiento de valor y lo que va a resultados', () => {
    const guardados = [...base(), rebaja('r1', 3, { parte: -3_000n, origen: 'e1' })];

    const cambios = cambiosDelRecorrido(guardados, promedio(guardados));

    expect(cambios.find((c) => c.id === 'r1')).toMatchObject({ costoTotal: -1_800n, montoAResultados: -1_200n });
  });

  it('una salida registrada antes de la rebaja cambia lo absorbido, y la diferencia queda para el evento', () => {
    const yaCosteada = rebaja('r1', 3, { parte: -3_000n, origen: 'e1', costoTotal: -3_000n });
    const guardados = [entrada('e1', 1, [100n, 20_000n]), salida('s1', 2, 40n), yaCosteada];

    const diferencias = diferenciasDeRepartos(guardados, promedio(guardados), new Set(['s1']));

    expect(diferencias).toEqual([
      {
        movimientoId: 'r1',
        documentoId: 'doc-r1',
        fecha: '2026-09-03',
        movimientoDeEntradaId: 'e1',
        diferenciaAbsorbidoCentavos: 1_200,
        diferenciaAResultadosCentavos: -1_200,
      },
    ]);
  });

  it('los repartos del documento que causa el recálculo no cuentan como diferencia', () => {
    const guardados = [...base(), rebaja('r1', 3, { parte: -3_000n, origen: 'e1' })];

    expect(diferenciasDeRepartos(guardados, promedio(guardados), new Set(['r1']))).toEqual([]);
  });

  it('con todo vendido antes de la rebaja, todo va a resultados', () => {
    const guardados = [
      entrada('e1', 1, [100n, 20_000n]),
      salida('s1', 2, 100n),
      rebaja('r1', 3, { parte: -3_000n, origen: 'e1' }),
    ];

    const resultados = promedio(guardados);

    expect(costos(resultados)).toEqual([20_000n, 20_000n, 0n]);
    expect(resultados[2]).toMatchObject({ aResultados: -3_000n, saldoValor: 0n });
  });
});
