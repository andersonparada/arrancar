import { describe, expect, it } from 'vitest';
import { CalendarioDeLunesAViernes, type CalendarioLaboral } from '../calendario-laboral.js';
import { diasHasta, plazoDeLaConstancia } from './plazo-de-la-constancia.js';

const lunesAViernes = new CalendarioDeLunesAViernes();
const sinFeriado = (feriado: string): CalendarioLaboral => ({
  esHabil: (fecha) => fecha !== feriado && lunesAViernes.esHabil(fecha),
});

const isr = (fechaDeLaRetencion: string, calendario: CalendarioLaboral = lunesAViernes) =>
  plazoDeLaConstancia({ impuesto: 'isr', fechaDeLaRetencion, calendario });

describe('plazo de la constancia', () => {
  it('en el ISR es el quinto día hábil del mes siguiente', () => {
    // Noviembre de 2026 empieza en domingo: hábiles el 2, 3, 4, 5 y 6.
    expect(isr('2026-10-15')).toBe('2026-11-06');
    expect(isr('2026-10-31')).toBe('2026-11-06');
  });

  it('corre al siguiente hábil si un feriado cae dentro de los cinco días', () => {
    expect(isr('2026-10-15', sinFeriado('2026-11-03'))).toBe('2026-11-09');
  });

  it('cuenta desde el mes siguiente también al cambiar de año', () => {
    // Enero de 2027 empieza en viernes: 1, 4, 5, 6 y 7.
    expect(isr('2026-12-20')).toBe('2027-01-07');
  });

  it('en el IVA no hay plazo propio', () => {
    expect(
      plazoDeLaConstancia({ impuesto: 'iva', fechaDeLaRetencion: '2026-10-15', calendario: lunesAViernes }),
    ).toBeNull();
  });

  it('los días que faltan son negativos cuando ya pasó', () => {
    expect(diasHasta('2026-11-10', '2026-11-06')).toBe(-4);
    expect(diasHasta('2026-11-06', '2026-11-06')).toBe(0);
    expect(diasHasta('2026-11-01', '2026-11-06')).toBe(5);
  });
});
