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
});
