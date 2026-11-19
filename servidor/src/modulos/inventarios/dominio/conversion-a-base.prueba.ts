import { describe, expect, it } from 'vitest';
import { convertirABase, UnidadSinConversion, type UnidadParaConvertir } from './conversion-a-base.js';

const libra: UnidadParaConvertir = { id: 'lb', magnitud: 'masa', factorALaReferencia: '1' };
const quintal: UnidadParaConvertir = { id: 'qq', magnitud: 'masa', factorALaReferencia: '100' };
const kilogramo: UnidadParaConvertir = { id: 'kg', magnitud: 'masa', factorALaReferencia: '2.20462262' };
const galon: UnidadParaConvertir = { id: 'gal', magnitud: 'volumen', factorALaReferencia: '1' };
const caja: UnidadParaConvertir = { id: 'caja', magnitud: 'empaque', factorALaReferencia: null };

interface Pedido {
  unidad: UnidadParaConvertir;
  base: UnidadParaConvertir;
  /** Unidades base en una unidad de empaque del artículo. */
  factor?: string;
}

const convertir = (cantidad: bigint, { unidad, base, factor }: Pedido) =>
  convertirABase({
    cantidad,
    unidad,
    base,
    conversiones: factor ? [{ unidadId: unidad.id, factor, paraCompras: false }] : [],
  });

describe('conversión de una cantidad a la unidad base del artículo', () => {
  it('la unidad base queda igual', () => {
    expect(convertir(125000n, { unidad: libra, base: libra })).toBe(125000n);
  });

  it('las unidades de la misma magnitud pasan por su factor a la referencia, sin configurar nada', () => {
    expect(convertir(20000n, { unidad: quintal, base: libra })).toBe(2_000_000n);
    expect(convertir(10000n, { unidad: libra, base: quintal })).toBe(100n);
    expect(convertir(10000n, { unidad: kilogramo, base: libra })).toBe(22046n);
  });

  it('redondea al más cercano en diezmilésimas', () => {
    expect(convertir(10000n, { unidad: libra, base: quintal })).toBe(100n);
    expect(convertir(5n, { unidad: quintal, base: libra })).toBe(500n);
    expect(convertir(1n, { unidad: libra, base: kilogramo })).toBe(0n);
  });

  it('las unidades de empaque usan la conversión del artículo', () => {
    expect(convertir(20000n, { unidad: caja, base: libra, factor: '24' })).toBe(480_000n);
    expect(convertir(5000n, { unidad: caja, base: libra, factor: '0.5' })).toBe(2500n);
  });

  it('sin conversión, o con otra magnitud, falla con unidad_sin_conversion', () => {
    expect(() => convertir(10000n, { unidad: caja, base: libra })).toThrow(UnidadSinConversion);
    expect(() => convertir(10000n, { unidad: galon, base: libra })).toThrow(UnidadSinConversion);
  });
});
