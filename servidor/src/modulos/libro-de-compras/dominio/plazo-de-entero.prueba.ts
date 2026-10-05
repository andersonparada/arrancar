import { describe, expect, it } from 'vitest';
import { esEnteroVencido, fechaLimiteDeEntero } from './plazo-de-entero.js';

describe('fecha límite de entero de una retención', () => {
  it('es el día hábil número N del mes siguiente, contando de lunes a viernes', () => {
    // Octubre de 2026 empieza en jueves: el 15.º día hábil es el miércoles 21.
    expect(fechaLimiteDeEntero('2026-09-15', 15)).toBe('2026-10-21');
    expect(fechaLimiteDeEntero('2026-09-30', 10)).toBe('2026-10-14');
  });

  it('si el mes siguiente empieza en fin de semana, cuenta desde el lunes', () => {
    // Agosto de 2026 empieza en sábado: el primer día hábil es el lunes 3.
    expect(fechaLimiteDeEntero('2026-07-20', 1)).toBe('2026-08-03');
    expect(fechaLimiteDeEntero('2026-07-20', 6)).toBe('2026-08-10');
  });

  it('cruza el fin de año', () => {
    // Enero de 2027 empieza en viernes.
    expect(fechaLimiteDeEntero('2026-12-31', 3)).toBe('2027-01-05');
  });

  it('el último día del plazo todavía no está vencido, y el siguiente sí', () => {
    expect(esEnteroVencido('2026-10-21', '2026-09-15', 15)).toBe(false);
    expect(esEnteroVencido('2026-10-22', '2026-09-15', 15)).toBe(true);
  });
});
