import { describe, expect, it } from 'vitest';
import { fechaLocalEn, ZONA_HORARIA_POR_OMISION } from './fecha-local.js';

describe('fechaLocalEn', () => {
  it('a las 20:00 de Guatemala sigue siendo el mismo día aunque en UTC ya sea el siguiente', () => {
    const veinteHorasEnGuatemala = new Date('2026-09-30T02:00:00Z');
    expect(veinteHorasEnGuatemala.toISOString().slice(0, 10)).toBe('2026-09-30');
    expect(fechaLocalEn(veinteHorasEnGuatemala, ZONA_HORARIA_POR_OMISION)).toBe('2026-09-29');
  });

  it('a las 00:00 de Guatemala ya es el día siguiente', () => {
    expect(fechaLocalEn(new Date('2026-09-30T06:00:00Z'), ZONA_HORARIA_POR_OMISION)).toBe('2026-09-30');
  });

  it('un minuto antes de la medianoche todavía es el día anterior', () => {
    expect(fechaLocalEn(new Date('2026-09-30T05:59:00Z'), ZONA_HORARIA_POR_OMISION)).toBe('2026-09-29');
  });

  it('respeta el cambio de año', () => {
    expect(fechaLocalEn(new Date('2027-01-01T03:00:00Z'), ZONA_HORARIA_POR_OMISION)).toBe('2026-12-31');
  });

  it('usa la zona que se le pida', () => {
    expect(fechaLocalEn(new Date('2026-09-29T20:00:00Z'), 'Asia/Tokyo')).toBe('2026-09-30');
  });

  it('rechaza una zona horaria desconocida', () => {
    expect(() => fechaLocalEn(new Date(), 'Marte/Olimpo')).toThrow(RangeError);
  });
});
