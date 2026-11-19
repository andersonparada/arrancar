import { describe, expect, it } from 'vitest';
import { ultimoDiaDePublicacionDeCrucesAntesDe } from './fechas-de-publicacion.js';
import { normalizarPublicaciones, type DolarDelDia } from './normalizar-publicaciones.js';
import type { PublicacionDeTipoDeCambio } from './publicacion.js';

const dolares = new Map<string, DolarDelDia>([['2026-11-18', { id: 'usd-18', referencia: '7.64489' }]]);

const cruce = (moneda: string, fecha: string, promedio: string): PublicacionDeTipoDeCambio => ({
  moneda,
  codigoBanguat: 9,
  fecha,
  referencia: promedio,
  compra: promedio,
  venta: promedio,
});

describe('normalizarPublicaciones', () => {
  it('pasa a quetzales con el dólar de la misma fecha y guarda la convención y el dólar usado', () => {
    const { normalizadas, rechazadas } = normalizarPublicaciones({
      publicaciones: [cruce('GBP', '2026-11-18', '1.31645')],
      convencion: 'usd_por_unidad',
      dolares,
    });

    expect(rechazadas).toEqual([]);
    expect(normalizadas).toEqual([
      expect.objectContaining({ referencia: '10.06411544', convencion: 'usd_por_unidad', dolarUsadoId: 'usd-18' }),
    ]);
  });

  it('las monedas de unidades por dólar se dividen', () => {
    const { normalizadas } = normalizarPublicaciones({
      publicaciones: [cruce('CHF', '2026-11-18', '0.84265')],
      convencion: 'unidades_por_usd',
      dolares,
    });

    expect(normalizadas[0]).toMatchObject({ referencia: '9.07243814', convencion: 'unidades_por_usd' });
  });

  it('sin el dólar de esa fecha no usa el de otro día: sin_dolar_del_dia', () => {
    const { normalizadas, rechazadas } = normalizarPublicaciones({
      publicaciones: [cruce('GBP', '2026-11-19', '1.31645')],
      convencion: 'usd_por_unidad',
      dolares,
    });

    expect(normalizadas).toEqual([]);
    expect(rechazadas).toEqual([{ moneda: 'GBP', fecha: '2026-11-19', motivo: 'sin_dolar_del_dia' }]);
  });

  it('el dólar solo recibe su convención', () => {
    const { normalizadas } = normalizarPublicaciones({
      publicaciones: [{ ...cruce('USD', '2026-11-18', '7.64489'), codigoBanguat: 2 }],
      convencion: 'quetzales_por_unidad',
      dolares: new Map(),
    });

    expect(normalizadas).toEqual([
      expect.objectContaining({ referencia: '7.64489', convencion: 'quetzales_por_unidad' }),
    ]);
    expect(normalizadas[0]?.dolarUsadoId).toBeUndefined();
  });
});

describe('ultimoDiaDePublicacionDeCrucesAntesDe', () => {
  it('el domingo y el sábado, el viernes anterior; el lunes, también el viernes', () => {
    expect(ultimoDiaDePublicacionDeCrucesAntesDe('2026-11-15')).toBe('2026-11-13');
    expect(ultimoDiaDePublicacionDeCrucesAntesDe('2026-11-14')).toBe('2026-11-13');
    expect(ultimoDiaDePublicacionDeCrucesAntesDe('2026-11-16')).toBe('2026-11-13');
    expect(ultimoDiaDePublicacionDeCrucesAntesDe('2026-11-18')).toBe('2026-11-17');
  });
});
