import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { VigenciaDeCombustible } from '../../servicios/vigencias-de-combustible.api';
import { edicionDe, edicionNuevaDe } from './edicion-de-vigencia-de-combustible';
import {
  avisoDeCierre,
  diaAnterior,
  esTasaVigente,
  mensajeDeEliminacion,
  tasaVigente,
  tasasDeUnCombustible,
} from './reglas-de-vigencia-de-combustible';

// Los textos dan formato con `formatearFecha` y `formatearMonto`, que leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const tasa = (cambios: Partial<VigenciaDeCombustible>): VigenciaDeCombustible => ({
  id: 'v-0',
  combustibleId: 'c-1',
  combustibleNombre: 'Diésel',
  idpPorGalon: '4.70',
  porcentajeDeEtanol: '0.00',
  vigenteDesde: '2026-01-01',
  vigenteHasta: null,
  ...cambios,
});
const vieja = tasa({ id: 'v-1', vigenteDesde: '2025-01-01', vigenteHasta: '2025-12-31' });
const actual = tasa({ id: 'v-2' });
const deOtro = tasa({ id: 'v-3', combustibleId: 'c-2', vigenteDesde: '2026-02-01' });

describe('tasas de un combustible', () => {
  it('trae solo las de ese combustible, de la más reciente a la más antigua', () => {
    expect(tasasDeUnCombustible([vieja, deOtro, actual], 'c-1').map((t) => t.id)).toEqual(['v-2', 'v-1']);
  });

  it('la vigente es la que no tiene fecha de cierre', () => {
    expect(esTasaVigente(actual)).toBe(true);
    expect(esTasaVigente(vieja)).toBe(false);
    expect(tasaVigente([vieja, actual])).toBe(actual);
    expect(tasaVigente([vieja])).toBeNull();
  });
});

describe('día anterior', () => {
  it('resta un día, también entre meses y años', () => {
    expect(diaAnterior('2026-03-15')).toBe('2026-03-14');
    expect(diaAnterior('2026-03-01')).toBe('2026-02-28');
    expect(diaAnterior('2026-01-01')).toBe('2025-12-31');
  });

  it('con una fecha incompleta o imposible no responde', () => {
    expect(diaAnterior('')).toBeNull();
    expect(diaAnterior('2026-13-40')).toBeNull();
  });
});

describe('aviso de cierre al registrar una tasa nueva', () => {
  it('avisa que cerrará la vigente el día anterior al inicio', () => {
    const edicion = { ...edicionNuevaDe('c-1'), vigenteDesde: '2026-07-01' };
    const aviso = avisoDeCierre(actual, edicion);
    expect(aviso).toContain('se cerrará el 30/06/2026');
    expect(aviso).toContain('Q');
  });

  it('sin fecha de inicio todavía avisa igual, sin inventar el día', () => {
    expect(avisoDeCierre(actual, edicionNuevaDe('c-1'))).toContain('el día anterior al inicio');
  });

  it('no avisa si no hay vigente, si ya trae cierre o si se está editando', () => {
    expect(avisoDeCierre(null, edicionNuevaDe('c-1'))).toBeNull();
    expect(avisoDeCierre(actual, { ...edicionNuevaDe('c-1'), vigenteHasta: '2026-12-31' })).toBeNull();
    expect(avisoDeCierre(actual, edicionDe(actual))).toBeNull();
  });
});

describe('confirmación de eliminar', () => {
  it('una tasa cerrada dice sus fechas', () => {
    const mensaje = mensajeDeEliminacion(vieja);
    expect(mensaje).toContain('desde el 01/01/2025 hasta el 31/12/2025');
    expect(mensaje).not.toContain('sin tasa vigente');
  });

  it('la vigente advierte que el combustible se queda sin tasa', () => {
    expect(mensajeDeEliminacion(actual)).toContain('sin tasa vigente');
  });
});
