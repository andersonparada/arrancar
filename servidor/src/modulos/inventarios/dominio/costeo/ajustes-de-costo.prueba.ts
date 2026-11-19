import { describe, expect, it } from 'vitest';
import { CostoManualRequerido, RepartoInvalido } from './errores.js';
import { costoUnitarioDe, valorDe } from './escalas.js';
import { absorber, repartirMonto } from './reparto.js';
import { costoUnitarioDeSobrante, valorDeSobrante } from './sobrante.js';

const lb = (n: number): bigint => BigInt(n) * 10_000n;

describe('costos adicionales y rebajas (§7.5)', () => {
  it('flete de Q30.00 sobre 100 lb cuando quedan 60: absorbe Q18.00 y Q12.00 van a resultados', () => {
    const r = absorber({
      parte: 3_000n,
      cantidadDeLaEntrada: lb(100),
      cantidadQueQueda: lb(60),
      valorQueQueda: 12_000n,
    });
    expect(r).toEqual({ absorbido: 1_800n, aResultados: 1_200n });
  });

  it('si queda más que la entrada, absorbe todo', () => {
    const r = absorber({
      parte: 3_000n,
      cantidadDeLaEntrada: lb(100),
      cantidadQueQueda: lb(300),
      valorQueQueda: 9_000n,
    });
    expect(r).toEqual({ absorbido: 3_000n, aResultados: 0n });
  });

  it('si no queda nada, todo va a resultados', () => {
    const r = absorber({ parte: 3_000n, cantidadDeLaEntrada: lb(100), cantidadQueQueda: 0n, valorQueQueda: 0n });
    expect(r).toEqual({ absorbido: 0n, aResultados: 3_000n });
  });

  it('una rebaja nunca deja el valor negativo: el exceso va a resultados', () => {
    const r = absorber({
      parte: -5_000n,
      cantidadDeLaEntrada: lb(100),
      cantidadQueQueda: lb(100),
      valorQueQueda: 2_000n,
    });
    expect(r).toEqual({ absorbido: -2_000n, aResultados: -3_000n });
  });

  it('el reparto suma exactamente el monto: el último renglón absorbe el redondeo', () => {
    const partes = repartirMonto(1_000n, [
      { entradaId: 'a', base: 1n },
      { entradaId: 'b', base: 1n },
      { entradaId: 'c', base: 1n },
    ]);
    expect([...partes.values()]).toEqual([333n, 333n, 334n]);
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
});
