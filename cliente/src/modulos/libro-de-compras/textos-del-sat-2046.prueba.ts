import { describe, expect, it } from 'vitest';
import { VENTANA_DEL_SAT_2046 as textos } from './textos-del-sat-2046';

describe('guía del SAT-2046', () => {
  it('tiene los dos caminos con pasos y sin pasos repetidos', () => {
    expect(textos.caminos.map((c) => c.clave)).toEqual(['app-fel', 'declaraguate']);
    for (const camino of textos.caminos) {
      expect(camino.pasos.length).toBeGreaterThanOrEqual(4);
      expect(new Set(camino.pasos).size).toBe(camino.pasos.length);
    }
  });

  it('recuerda declarar aunque sea en cero, que las compras son respaldo y que el cálculo llega con Ventas', () => {
    expect(textos.recordatorio).toContain('en cero');
    expect(textos.compras).toContain('respaldo');
    expect(textos.calculo).toContain('módulo de Ventas');
  });

  it('el camino de Declaraguate pasa por validar, congelar y la boleta SAT-2000', () => {
    const pasos = textos.caminos[1]?.pasos.join(' ');

    expect(pasos).toContain('Validar');
    expect(pasos).toContain('Congelar');
    expect(pasos).toContain('SAT-2000');
  });
});
