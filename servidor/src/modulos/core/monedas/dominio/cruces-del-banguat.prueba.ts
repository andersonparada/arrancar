import { describe, expect, it } from 'vitest';
import {
  inversionProbable,
  normalizarAQuetzales,
  promedioPublicado,
  revisarCompraYVenta,
} from './cruces-del-banguat.js';
import { diasDePublicacionDeCruces, esDiaDePublicacionDeCruces, fechasDelRango } from './fechas-de-publicacion.js';
import type { ConvencionDePublicacion } from './publicacion.js';

const DOLAR_DEL_18_DE_NOVIEMBRE = '7.64489';

function aQuetzales(convencion: ConvencionDePublicacion, compra: string, venta: string) {
  return normalizarAQuetzales({ convencion, promedio: promedioPublicado(compra, venta)!, dolar: '7.64489' });
}

describe('promedioPublicado', () => {
  it('es exacto y trae a lo más un decimal más que lo publicado', () => {
    expect(promedioPublicado('1.3164', '1.3165')).toBe('1.31645');
    expect(promedioPublicado('1555.84009', '1556.18018')).toBe('1556.010135');
    expect(promedioPublicado('3311.25', '3312.6')).toBe('3311.925');
    expect(promedioPublicado('1.12', '1.12')).toBe('1.12');
  });

  it('acepta notación científica y no es posible con texto ilegible', () => {
    expect(promedioPublicado('4.4477E2', '4.4904E2')).toBe('446.905');
    expect(promedioPublicado('x', '1')).toBeUndefined();
  });
});

describe('revisarCompraYVenta', () => {
  it('con un diferencial menor devuelve el promedio y lo publicado normalizado', () => {
    expect(revisarCompraYVenta('444.77', '449.04')).toEqual({
      valida: true,
      promedio: '446.905',
      compra: '444.77',
      venta: '449.04',
    });
  });

  it('rechaza el diferencial de 3.01 % y acepta el de 3 %', () => {
    expect(revisarCompraYVenta('100', '103.06')).toEqual({ valida: false, motivo: 'valor_ambiguo' });
    expect(revisarCompraYVenta('98.5', '101.5')).toMatchObject({ valida: true });
  });

  it('venta menor que compra, cero y texto malo son datos inválidos', () => {
    expect(revisarCompraYVenta('1.2', '1.1')).toEqual({ valida: false, motivo: 'dato_invalido' });
    expect(revisarCompraYVenta('0', '1.1')).toEqual({ valida: false, motivo: 'dato_invalido' });
    expect(revisarCompraYVenta('1.1', 'abc')).toEqual({ valida: false, motivo: 'dato_invalido' });
  });
});

describe('normalizarAQuetzales (los cinco ejemplos de la adenda B.3, con el dólar del 18/11/2026)', () => {
  it('libra: dólares por unidad, dólar × promedio', () => {
    expect(aQuetzales('usd_por_unidad', '1.3164', '1.3165')).toBe('10.06411544');
  });

  it('franco suizo: unidades por dólar, dólar ÷ promedio', () => {
    expect(aQuetzales('unidades_por_usd', '0.8426', '0.8427')).toBe('9.07243814');
  });

  it('peso mexicano', () => {
    expect(aQuetzales('unidades_por_usd', '18.5677', '18.5717')).toBe('0.41168624');
  });

  it('colón: primero el promedio del cruce y después la conversión, no el promedio de las dos conversiones', () => {
    expect(aQuetzales('unidades_por_usd', '444.77', '449.04')).toBe('0.0171063');
    const promedioDeLasConversiones = (7.64489 / 444.77 + 7.64489 / 449.04) / 2;
    expect(promedioDeLasConversiones.toFixed(8)).toBe('0.01710669');
  });

  it('peso colombiano: el redondeo a 8 decimales se hace una sola vez', () => {
    expect(aQuetzales('unidades_por_usd', '3311.25', '3312.6')).toBe('0.00230829');
  });

  it('el peso argentino usa el promedio con un decimal más', () => {
    expect(aQuetzales('unidades_por_usd', '1555.84009', '1556.18018')).toBe('0.00491314');
  });

  it('redondea desde la mitad hacia arriba', () => {
    expect(
      normalizarAQuetzales({ convencion: 'unidades_por_usd', promedio: '4', dolar: '0.00000001' }),
    ).toBeUndefined();
    expect(normalizarAQuetzales({ convencion: 'usd_por_unidad', promedio: '0.5', dolar: '0.00000001' })).toBe(
      '0.00000001',
    );
    expect(
      normalizarAQuetzales({ convencion: 'usd_por_unidad', promedio: '0.4', dolar: '0.00000001' }),
    ).toBeUndefined();
  });

  it('la convención en quetzales deja el promedio como está', () => {
    expect(normalizarAQuetzales({ convencion: 'quetzales_por_unidad', promedio: '7.64489', dolar: '9' })).toBe(
      DOLAR_DEL_18_DE_NOVIEMBRE,
    );
  });

  it('datos inválidos o un resultado que no cabe dan undefined', () => {
    expect(normalizarAQuetzales({ convencion: 'usd_por_unidad', promedio: 'x', dolar: '7.6' })).toBeUndefined();
    expect(normalizarAQuetzales({ convencion: 'unidades_por_usd', promedio: '0', dolar: '7.6' })).toBeUndefined();
    expect(normalizarAQuetzales({ convencion: 'usd_por_unidad', promedio: '99999', dolar: '99999' })).toBeUndefined();
  });
});

describe('inversionProbable', () => {
  it('el euro que llega como 0.8883 euros por dólar en vez de 1.1257 dólares por euro es una inversión', () => {
    expect(inversionProbable('0.8883', '1.1257')).toBe(true);
  });

  it('el franco suizo que se mueve 2 % cerca de la paridad no se evalúa', () => {
    expect(inversionProbable('0.8595', '0.8427')).toBe(false);
    expect(inversionProbable('0.8259', '0.8427')).toBe(false);
  });

  it('el peso argentino devaluado 87 % no es una inversión', () => {
    expect(inversionProbable('1500', '800')).toBe(false);
  });

  it('el mismo valor, el cero y el texto malo no lo son', () => {
    expect(inversionProbable('1.1257', '1.1257')).toBe(false);
    expect(inversionProbable('0', '1.1257')).toBe(false);
    expect(inversionProbable('x', '1.1257')).toBe(false);
  });

  it('un salto de más de 5 % cerca de la paridad pero que no es el inverso tampoco lo es', () => {
    expect(inversionProbable('1.20', '1.1257')).toBe(false);
  });

  it('también al revés: el colón como 0.00225 dólares por colón en vez de 444.77 colones por dólar', () => {
    expect(inversionProbable('0.00225', '444.77')).toBe(true);
    expect(inversionProbable('1.1257', '0.8883')).toBe(true);
  });
});

describe('días de publicación de las demás monedas', () => {
  it('de lunes a viernes, incluso el jueves santo y el 25 de diciembre', () => {
    expect(esDiaDePublicacionDeCruces('2026-04-02')).toBe(true);
    expect(esDiaDePublicacionDeCruces('2026-04-03')).toBe(true);
    expect(esDiaDePublicacionDeCruces('2026-10-20')).toBe(true);
    expect(esDiaDePublicacionDeCruces('2026-12-25')).toBe(true);
  });

  it('nunca el sábado ni el domingo', () => {
    expect(esDiaDePublicacionDeCruces('2026-11-14')).toBe(false);
    expect(esDiaDePublicacionDeCruces('2026-11-15')).toBe(false);
  });

  it('una fecha que no existe es un error', () => {
    expect(() => esDiaDePublicacionDeCruces('2026-02-30')).toThrow(RangeError);
  });

  it('enumera los días esperados de un rango', () => {
    expect([...diasDePublicacionDeCruces('2026-11-13', '2026-11-18')]).toEqual([
      '2026-11-13',
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
    ]);
    expect(fechasDelRango('2026-11-13', '2026-11-18')).toHaveLength(6);
  });
});
