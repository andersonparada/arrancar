import { describe, expect, it } from 'vitest';
import { ROLES_DE_CUENTA } from './contabilidad.contratos.js';

describe('roles de cuenta de Contabilidad', () => {
  it('no se repiten y llevan los roles que corrigió la validación', () => {
    expect(new Set(ROLES_DE_CUENTA).size).toBe(ROLES_DE_CUENTA.length);
    expect(ROLES_DE_CUENTA).toEqual(
      expect.arrayContaining(['isr_sobre_intereses', 'apertura_por_regularizar', 'iva_por_rectificar']),
    );
    expect(ROLES_DE_CUENTA).not.toContain('isr_retenido_en_intereses');
  });

  it('solo usan minúsculas y guion bajo', () => {
    for (const rol of ROLES_DE_CUENTA) expect(rol).toMatch(/^[a-z_]+$/);
  });
});
