import { describe, expect, it } from 'vitest';
import { evaluarVariaciones } from './evaluar-variaciones.js';
import type { PublicacionDeTipoDeCambio } from './publicacion.js';

const publicacion = (moneda: string, fecha: string, referencia: string): PublicacionDeTipoDeCambio => ({
  moneda,
  codigoBanguat: moneda === 'USD' ? 2 : 24,
  fecha,
  referencia,
});

describe('evaluarVariaciones', () => {
  it('guarda la primera carga de una moneda sin valor anterior', () => {
    const resultado = evaluarVariaciones({ publicaciones: [publicacion('EUR', '2026-11-18', '9.10')], anterior: null });
    expect(resultado.aGuardar).toHaveLength(1);
    expect(resultado.rechazadas).toEqual([]);
    expect(resultado.avisos).toEqual([]);
  });

  it('una moneda que cambia 30 % no se guarda y queda como variacion_excesiva', () => {
    const resultado = evaluarVariaciones({ publicaciones: [publicacion('EUR', '2026-11-18', '11.70')], anterior: '9' });
    expect(resultado.aGuardar).toEqual([]);
    expect(resultado.rechazadas).toEqual([{ moneda: 'EUR', fecha: '2026-11-18', motivo: 'variacion_excesiva' }]);
  });

  it('entre 3 % y 25 % se guarda con aviso', () => {
    const resultado = evaluarVariaciones({ publicaciones: [publicacion('EUR', '2026-11-18', '9.50')], anterior: '9' });
    expect(resultado.aGuardar).toHaveLength(1);
    expect(resultado.avisos).toHaveLength(1);
  });

  it('el dólar no se rechaza por variar (su banda ya lo protege), solo avisa', () => {
    const resultado = evaluarVariaciones({
      publicaciones: [publicacion('USD', '2026-11-18', '9.60')],
      anterior: '7.70',
    });
    expect(resultado.aGuardar).toHaveLength(1);
    expect(resultado.avisos).toHaveLength(1);
  });

  it('compara cada día con el de antes dentro de la misma carga, en orden de fechas', () => {
    const resultado = evaluarVariaciones({
      publicaciones: [
        publicacion('EUR', '2026-11-17', '9.05'),
        publicacion('EUR', '2026-11-16', '9.00'),
        publicacion('EUR', '2026-11-18', '9.07'),
      ],
      anterior: null,
    });
    expect(resultado.aGuardar.map((p) => p.fecha)).toEqual(['2026-11-16', '2026-11-17', '2026-11-18']);
    expect(resultado.avisos).toEqual([]);
  });

  describe('en las monedas que se cruzan', () => {
    const cruce = (fecha: string, publicado: string, referencia: string): PublicacionDeTipoDeCambio => ({
      ...publicacion('EUR', fecha, referencia),
      compra: publicado,
      venta: publicado,
      convencion: 'usd_por_unidad',
    });

    it('un euro al revés no se guarda aunque en quetzales varíe menos de 25 %: convencion_dudosa', () => {
      const resultado = evaluarVariaciones({
        publicaciones: [cruce('2026-11-18', '0.8883', '6.79')],
        anterior: '8.61',
        anteriorPublicado: '1.1257',
      });

      expect(resultado.aGuardar).toEqual([]);
      expect(resultado.rechazadas).toEqual([{ moneda: 'EUR', fecha: '2026-11-18', motivo: 'convencion_dudosa' }]);
    });

    it('un cambio real de 2 % cerca de la paridad se guarda sin aviso', () => {
      const resultado = evaluarVariaciones({
        publicaciones: [cruce('2026-11-18', '1.1482', '8.78')],
        anterior: '8.61',
        anteriorPublicado: '1.1257',
      });

      expect(resultado.aGuardar).toHaveLength(1);
      expect(resultado.avisos).toEqual([]);
    });

    it('una devaluación real grande no se confunde con una inversión: cae en variacion_excesiva', () => {
      const resultado = evaluarVariaciones({
        publicaciones: [{ ...cruce('2026-11-18', '1500', '0.0051'), convencion: 'unidades_por_usd' }],
        anterior: '0.0095',
        anteriorPublicado: '800',
      });

      expect(resultado.rechazadas).toMatchObject([{ motivo: 'variacion_excesiva' }]);
    });

    it('lo publicado que cambia más de 3 % se guarda con aviso', () => {
      const resultado = evaluarVariaciones({
        publicaciones: [cruce('2026-11-18', '1.1700', '8.95')],
        anterior: '8.61',
        anteriorPublicado: '1.1257',
      });

      expect(resultado.aGuardar).toHaveLength(1);
      expect(resultado.avisos).toHaveLength(1);
    });
  });
});
