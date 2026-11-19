import { describe, expect, it } from 'vitest';
import { CostoManualRequerido, RepartoInvalido } from './errores.js';
import { costoUnitarioDe, valorDe } from './escalas.js';
import { absorberConFactor } from './absorcion.js';
import { repartirMonto } from './reparto.js';
import { costoUnitarioDeSobrante, valorDeSobrante } from './sobrante.js';
import { costoAjustadoDeLaUltimaEntrada, tieneCostoReal } from './ultima-entrada.js';

const lb = (n: number): bigint => BigInt(n) * 10_000n;
const entrada = {
  fecha: '2026-01-01',
  secuencia: 1,
  origen: 'recepcion',
  cantidad: lb(50),
  costoTotal: 11_500n,
} as const;

describe('reparto y absorción por factor (§7.5)', () => {
  const mitad = { numerador: 1n, denominador: 2n };

  it('flete de Q30.00 con factor 0.6 absorbe Q18.00 y Q12.00 van a resultados', () => {
    const r = absorberConFactor(3_000n, { numerador: 3n, denominador: 5n }, 12_000n);
    expect(r).toEqual({ absorbido: 1_800n, aResultados: 1_200n });
  });

  it('con factor 1 absorbe todo y con factor 0 todo va a resultados', () => {
    expect(absorberConFactor(3_000n, { numerador: 1n, denominador: 1n }, 9_000n)).toEqual({
      absorbido: 3_000n,
      aResultados: 0n,
    });
    expect(absorberConFactor(3_000n, { numerador: 0n, denominador: 1n }, 0n)).toEqual({
      absorbido: 0n,
      aResultados: 3_000n,
    });
  });

  it('una rebaja nunca deja el valor negativo: el exceso va a resultados', () => {
    expect(absorberConFactor(-5_000n, { numerador: 1n, denominador: 1n }, 2_000n)).toEqual({
      absorbido: -2_000n,
      aResultados: -3_000n,
    });
    expect(absorberConFactor(-5_000n, mitad, 1_000n).absorbido).toBe(-1_000n);
  });

  it('el reparto suma exactamente el monto: con redondeo acumulado', () => {
    const partes = repartirMonto(1_000n, [
      { entradaId: 'a', base: 1n },
      { entradaId: 'b', base: 1n },
      { entradaId: 'c', base: 1n },
    ]);
    expect([...partes.values()]).toEqual([333n, 334n, 333n]);
  });

  it('con bases iguales ninguna parte se desvía más de un centavo ni sale negativa', () => {
    const base = (n: number) => Array.from({ length: n }, (_, i) => ({ entradaId: `e${i}`, base: 1n }));
    for (const [monto, n] of [
      [2n, 4],
      [10n, 20],
    ] as const) {
      const partes = [...repartirMonto(monto, base(n)).values()];
      expect(partes.reduce((a, b) => a + b, 0n)).toBe(monto);
      expect(partes.every((p) => p >= 0n && p <= 1n)).toBe(true);
    }
  });

  it('rechaza repartir sobre una base que suma cero', () => {
    expect(() => repartirMonto(100n, [{ entradaId: 'a', base: 0n }])).toThrow(RepartoInvalido);
  });
});

describe('sobrante y faltante', () => {
  const estado = { cantidad: lb(150), valor: 31_500n };

  it('con promedio entra al promedio vigente (Q2.10)', () => {
    expect(costoUnitarioDe(31_500n, lb(150))).toBe(2_100_000n);
    expect(valorDeSobrante({ metodo: 'promedio_ponderado', cantidad: lb(10), estado })).toBe(2_100n);
  });

  it('con PEPS entra a la última entrada', () => {
    const datos = { metodo: 'peps', cantidad: lb(10), estado, costoDeLaUltimaEntrada: 2_300_000n } as const;
    expect(valorDeSobrante(datos)).toBe(2_300n);
    expect(valorDe(costoUnitarioDeSobrante(datos), lb(10))).toBe(2_300n);
  });

  it('sin referencia pide el costo a mano, y lo usa si viene', () => {
    const vacio = { cantidad: 0n, valor: 0n };
    const datos = { metodo: 'promedio_ponderado', cantidad: lb(10), estado: vacio } as const;
    expect(() => valorDeSobrante(datos)).toThrow(CostoManualRequerido);
    expect(valorDeSobrante({ ...datos, costoManual: 1_500_000n })).toBe(1_500n);
  });

  it('con promedio y sin existencia usa la última entrada con costo real', () => {
    const vacio = { cantidad: 0n, valor: 0n };
    const datos = {
      metodo: 'promedio_ponderado',
      cantidad: lb(10),
      estado: vacio,
      costoDeLaUltimaEntrada: 2_400_000n,
    } as const;
    expect(valorDeSobrante(datos)).toBe(2_400n);
  });
});

describe('última entrada con costo real (V-5)', () => {
  const despues = { fecha: '2026-02-01', secuencia: 9, tipo: 'salida' } as const;

  it('el costo ajustado incluye los repartos: (115.00 + 5.00) / 50 = 2.400000', () => {
    const costo = costoAjustadoDeLaUltimaEntrada([{ ...entrada, repartos: 500n }], despues);
    expect(costo).toBe(2_400_000n);
    expect(valorDe(costo ?? 0n, lb(10))).toBe(2_400n);
  });

  it('ignora traslados, sobrantes, errores de registro y entradas a costo cero', () => {
    const otras = (['traslado', 'sobrante', 'error_de_registro', 'donacion', 'entrada_manual'] as const).map(
      (origen, i) => ({ ...entrada, origen, costoTotal: 0n, repartos: 0n, secuencia: 5 + i }),
    );
    const real = { ...entrada, secuencia: 1, repartos: 0n };
    expect(costoAjustadoDeLaUltimaEntrada([real, ...otras], despues)).toBe(2_300_000n);
    expect(costoAjustadoDeLaUltimaEntrada(otras, despues)).toBeUndefined();
    expect(tieneCostoReal({ origen: 'entrada_manual', costoTotal: 1n })).toBe(true);
  });

  it('solo cuentan las anteriores a la posición', () => {
    const futura = { ...entrada, fecha: '2026-03-01', repartos: 0n };
    expect(costoAjustadoDeLaUltimaEntrada([futura], despues)).toBeUndefined();
  });
});
