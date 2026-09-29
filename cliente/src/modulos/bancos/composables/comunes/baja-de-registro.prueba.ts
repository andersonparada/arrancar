import { describe, expect, it } from 'vitest';
import { datosDeBajaNuevos, fechaDeHoy } from './baja-de-registro';

describe('fechaDeHoy', () => {
  it('escribe año, mes y día con ceros a la izquierda', () => {
    expect(fechaDeHoy(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(fechaDeHoy(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('usa la hora local: a las 23:30 sigue siendo el mismo día', () => {
    expect(fechaDeHoy(new Date(2026, 8, 28, 23, 30))).toBe('2026-09-28');
  });
});

describe('datosDeBajaNuevos', () => {
  it('empieza sin motivo y con la fecha de hoy', () => {
    expect(datosDeBajaNuevos(new Date(2026, 2, 9))).toEqual({ motivo: '', fecha: '2026-03-09' });
  });
});
