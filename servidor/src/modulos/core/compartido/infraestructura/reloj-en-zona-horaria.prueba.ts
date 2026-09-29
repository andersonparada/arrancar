import { describe, expect, it } from 'vitest';
import type { ContextoEmpresa } from '../aplicacion/contexto-empresa.js';
import type { PoliticaDeZonaHoraria } from '../aplicacion/reloj.js';
import { operadorDePrueba } from '../pruebas/dobles-compartidos.js';
import { RelojEnZonaHoraria } from './reloj-en-zona-horaria.js';

const politicaFija = (zona: string): PoliticaDeZonaHoraria => ({
  zonaHoraria: async (_contexto: ContextoEmpresa) => zona,
});

/** Las 20:00 del 29 de septiembre en Guatemala (UTC-6) son las 02:00 del 30 en UTC. */
const VEINTE_HORAS_EN_GUATEMALA = () => new Date('2026-09-30T02:00:00Z');

describe('RelojEnZonaHoraria', () => {
  it('a las 20:00 de Guatemala hoy sigue siendo el 29, no el 30 de UTC', async () => {
    const reloj = new RelojEnZonaHoraria(politicaFija('America/Guatemala'), VEINTE_HORAS_EN_GUATEMALA);
    expect(await reloj.hoy(operadorDePrueba())).toBe('2026-09-29');
  });

  it('respeta la zona horaria configurada para la empresa', async () => {
    const reloj = new RelojEnZonaHoraria(politicaFija('Europe/Madrid'), VEINTE_HORAS_EN_GUATEMALA);
    expect(await reloj.hoy(operadorDePrueba())).toBe('2026-09-30');
  });
});
