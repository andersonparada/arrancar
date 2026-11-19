import { describe, expect, it } from 'vitest';
import {
  detalleDeLaFila,
  esCruce,
  fraseDelCruce,
  textoDeLaConvencion,
  textoDeLoPublicado,
} from './convenciones-del-banguat';

describe('textoDeLaConvencion y esCruce', () => {
  it('dice la convención con palabras y vacío si no hay', () => {
    expect(textoDeLaConvencion('usd_por_unidad')).toBe('USD por unidad');
    expect(textoDeLaConvencion('unidades_por_usd')).toBe('unidades por USD');
    expect(textoDeLaConvencion('quetzales_por_unidad')).toBe('Q por unidad');
    expect(textoDeLaConvencion(null)).toBe('');
  });

  it('solo cruzan con el dólar las dos convenciones de otras monedas', () => {
    expect(esCruce('usd_por_unidad')).toBe(true);
    expect(esCruce('unidades_por_usd')).toBe(true);
    expect(esCruce('quetzales_por_unidad')).toBe(false);
    expect(esCruce(null)).toBe(false);
  });
});

describe('fraseDelCruce', () => {
  it('USD por unidad: la libra de B.3 (1.31645 × 7.64489 = 10.06411544)', () => {
    const valor = { promedio: '1.316450000', dolar: '7.64489000', referencia: '10.06411544' };
    expect(fraseDelCruce(valor, 'GBP', 'usd_por_unidad')).toBe('1.31645 USD por GBP × 7.64489 = Q 10.06411544');
  });

  it('unidades por USD: el franco suizo de B.3 (7.64489 ÷ 0.84265 = 9.07243814)', () => {
    const valor = { promedio: '0.84265', dolar: '7.64489', referencia: '9.07243814' };
    expect(fraseDelCruce(valor, 'CHF', 'unidades_por_usd')).toBe('7.64489 ÷ 0.84265 CHF por USD = Q 9.07243814');
  });

  it('queda vacía si falta el dólar del día o no es un cruce', () => {
    expect(fraseDelCruce({ promedio: '1.3', dolar: null, referencia: null }, 'GBP', 'usd_por_unidad')).toBe('');
    expect(fraseDelCruce({ promedio: '7.6', dolar: '7.6', referencia: '7.6' }, 'USD', 'quetzales_por_unidad')).toBe('');
  });
});

describe('textoDeLoPublicado', () => {
  it('enseña compra, venta y la convención', () => {
    expect(textoDeLoPublicado({ compra: '1.3164', venta: '1.3165' }, 'usd_por_unidad')).toBe(
      'Compra 1.31640 · venta 1.31650 (USD por unidad)',
    );
  });

  it('vacío si el Banguat no dio compra y venta', () => {
    expect(textoDeLoPublicado({ compra: null, venta: null }, null)).toBe('');
  });
});

describe('detalleDeLaFila', () => {
  const cruce = {
    compra: '1.3164',
    venta: '1.3165',
    convencion: 'usd_por_unidad' as const,
    dolarUsado: '7.64489000',
    origen: 'banguat' as const,
  };

  it('un cruce muestra lo publicado y el dólar usado', () => {
    expect(detalleDeLaFila(cruce)).toEqual([
      'Compra 1.31640 · venta 1.31650 (USD por unidad)',
      'Dólar usado: Q 7.64489',
    ]);
  });

  it('el dólar no tiene dólar usado y una fila manual no lleva detalle', () => {
    const dolar = {
      ...cruce,
      compra: '7.64',
      venta: '7.64',
      convencion: 'quetzales_por_unidad' as const,
      dolarUsado: null,
    };
    expect(detalleDeLaFila(dolar)).toEqual(['Compra 7.64000 · venta 7.64000 (Q por unidad)']);
    expect(detalleDeLaFila({ ...cruce, origen: 'manual' as const })).toEqual([]);
  });
});
