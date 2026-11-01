import { describe, expect, it } from 'vitest';
import { condicionesPorOmision, diasDesdeTexto, textoDeDias, textoDelPlazo } from './condiciones-de-pago';

describe('días de crédito', () => {
  it('un campo vacío es el plazo por omisión', () => {
    expect(diasDesdeTexto('')).toBeNull();
    expect(diasDesdeTexto(null)).toBeNull();
  });

  it('un número escrito se convierte, incluido el cero (de contado)', () => {
    expect(diasDesdeTexto('15')).toBe(15);
    expect(diasDesdeTexto('0')).toBe(0);
    expect(diasDesdeTexto(30)).toBe(30);
  });

  it('un decimal no se redondea: el servidor lo rechaza con su mensaje', () => {
    expect(diasDesdeTexto('1.5')).toBe(1.5);
  });

  it('vuelve al campo como texto, y el cero no se pierde', () => {
    expect(textoDeDias(null)).toBe('');
    expect(textoDeDias(0)).toBe('0');
    expect(textoDeDias(15)).toBe('15');
  });
});

describe('texto del plazo', () => {
  it('sin días es un mes, desde la emisión o la recepción', () => {
    expect(textoDelPlazo(condicionesPorOmision())).toBe('Un mes desde la emisión (plazo por omisión)');
    expect(textoDelPlazo({ diasDeCredito: null, contarDesdeLaRecepcion: true })).toBe(
      'Un mes desde la recepción (plazo por omisión)',
    );
  });

  it('cero días es de contado', () => {
    expect(textoDelPlazo({ diasDeCredito: 0, contarDesdeLaRecepcion: false })).toBe('De contado');
  });

  it('los días van en singular o plural', () => {
    expect(textoDelPlazo({ diasDeCredito: 1, contarDesdeLaRecepcion: false })).toBe('1 día desde la emisión');
    expect(textoDelPlazo({ diasDeCredito: 15, contarDesdeLaRecepcion: true })).toBe('15 días desde la recepción');
  });
});
