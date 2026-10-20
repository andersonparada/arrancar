import { describe, expect, it } from 'vitest';
import { estadoDelEntero } from './estado-del-entero.js';

const datos = (cambios: Partial<Parameters<typeof estadoDelEntero>[0]>) => ({
  retenido: 10000,
  pagado: 0,
  hoy: '2026-10-10',
  limite: '2026-10-21',
  ...cambios,
});

describe('estado del entero de un mes y grupo', () => {
  it('sin retenciones ni pagos no hay nada que enterar', () => {
    expect(estadoDelEntero(datos({ retenido: 0 }))).toBe('sin_retenciones');
  });

  it('sin pagos está pendiente en plazo y vencido después del último día', () => {
    expect(estadoDelEntero(datos({ hoy: '2026-10-21' }))).toBe('pendiente');
    expect(estadoDelEntero(datos({ hoy: '2026-10-22' }))).toBe('vencido');
  });

  it('con lo pagado igual a lo retenido está enterado, aunque el plazo haya vencido', () => {
    expect(estadoDelEntero(datos({ pagado: 10000, hoy: '2026-12-01' }))).toBe('enterado');
  });

  it('con otro monto, por ejemplo tras anular un documento, queda con diferencia', () => {
    expect(estadoDelEntero(datos({ pagado: 10000, retenido: 6000 }))).toBe('con_diferencia');
    expect(estadoDelEntero(datos({ pagado: 4000 }))).toBe('con_diferencia');
  });

  it('un pago sin retenciones también queda con diferencia', () => {
    expect(estadoDelEntero(datos({ retenido: 0, pagado: 500 }))).toBe('con_diferencia');
  });
});
