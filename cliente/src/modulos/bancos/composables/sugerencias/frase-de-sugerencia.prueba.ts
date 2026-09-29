import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { OpcionSugerida } from '../../servicios/sugerencias.api';
import { fraseDeSugerencia, rotuloDeOpcion, textoDeConfianza } from './frase-de-sugerencia';

// La frase da formato con `formatearMonto` y `formatearFecha`, que leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const opcion = (cambios: Partial<OpcionSugerida['porque']> = {}): OpcionSugerida => ({
  conceptoId: 'c1',
  conceptoNombre: 'Planilla',
  confianza: 85,
  porque: {
    base: 'mismo_beneficiario',
    casos: 4,
    ultimaFecha: '2026-08-12',
    montoMinimo: '150.00',
    montoMaximo: '1200.00',
    beneficiarioParecido: null,
    ...cambios,
  },
});

describe('rótulos', () => {
  it('escribe la confianza con su signo y la junta al nombre', () => {
    expect(textoDeConfianza(67)).toBe('67 %');
    expect(rotuloDeOpcion(opcion())).toBe('Planilla · 85 %');
  });
});

describe('fraseDeSugerencia', () => {
  it('dice cuántos de cuántos casos, el rango de montos y el último', () => {
    const frase = fraseDeSugerencia(opcion(), 5);

    expect(frase).toContain('4 de 5 movimientos de este beneficiario');
    expect(frase).toContain('150.00');
    expect(frase).toContain('1,200.00');
    expect(frase).toContain('el último el');
  });

  it('con un solo monto no escribe un rango y con un solo caso va en singular', () => {
    const frase = fraseDeSugerencia(opcion({ casos: 1, montoMinimo: '30.00', montoMaximo: '30.00' }), 1);

    expect(frase).toContain('1 de 1 movimiento de este beneficiario, de');
    expect(frase).not.toContain(' a ');
  });

  it('nombra al beneficiario parecido y a las notas sin beneficiario de la misma cuenta', () => {
    expect(fraseDeSugerencia(opcion({ base: 'beneficiario_parecido', beneficiarioParecido: 'Agro SA' }), 3)).toContain(
      'de un beneficiario parecido («Agro SA»)',
    );
    expect(fraseDeSugerencia(opcion({ base: 'misma_cuenta_sin_beneficiario' }), 4)).toContain(
      'sin beneficiario de esta misma cuenta',
    );
  });

  it('nunca dice más casos por el concepto que casos comparados', () => {
    expect(fraseDeSugerencia(opcion({ casos: 4 }), 2)).toContain('4 de 4 movimientos');
  });
});
