import { describe, expect, it } from 'vitest';
import { avisoDeFechaFutura, fechaDeHoyEn } from './aviso-de-fecha';

describe('fechaDeHoyEn', () => {
  it('usa el día de Guatemala aunque en UTC ya sea el siguiente', () => {
    expect(fechaDeHoyEn('America/Guatemala', new Date('2026-09-30T03:00:00Z'))).toBe('2026-09-29');
  });
});

describe('avisoDeFechaFutura', () => {
  it('avisa con atención si la fecha es posterior a hoy', () => {
    expect(avisoDeFechaFutura('2026-10-01', '2026-09-29')?.nivel).toBe('atencion');
  });
  it('en cheques solo informa que es posfechado', () => {
    const aviso = avisoDeFechaFutura('2026-10-01', '2026-09-29', true);
    expect(aviso?.nivel).toBe('informacion');
    expect(aviso?.texto).toContain('posfechado');
  });
  it('no avisa con hoy, el pasado, vacía o incompleta', () => {
    expect(avisoDeFechaFutura('2026-09-29', '2026-09-29')).toBeNull();
    expect(avisoDeFechaFutura('2026-01-01', '2026-09-29')).toBeNull();
    expect(avisoDeFechaFutura('', '2026-09-29')).toBeNull();
    expect(avisoDeFechaFutura('2026-1', '2026-09-29')).toBeNull();
  });
});
