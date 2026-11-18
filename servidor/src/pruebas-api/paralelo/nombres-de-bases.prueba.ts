import { describe, expect, it } from 'vitest';
import { esBaseDePruebasDelPrefijo, validarPrefijoDeBases } from './nombres-de-bases.js';

describe('validarPrefijoDeBases', () => {
  it.each(['arrancar_pruebas', 'arrancar_pruebas_par', 'a', 'x1_y2'])('acepta %s', (prefijo) => {
    expect(validarPrefijoDeBases(prefijo)).toBe(prefijo);
  });

  it.each([
    '',
    'arrancar',
    'arrancar_pruebas|x',
    'x|^arrancar$|y',
    'a.b',
    'a%',
    'A_b',
    '1abc',
    'a b',
    'a"; drop database arrancar; --',
    'a'.repeat(42),
  ])('rechaza %j', (prefijo) => {
    expect(() => validarPrefijoDeBases(prefijo)).toThrow(/BD_PRUEBAS/);
  });
});

describe('esBaseDePruebasDelPrefijo', () => {
  const prefijo = 'arrancar_pruebas';

  it('reconoce la plantilla y las bases de workers', () => {
    expect(esBaseDePruebasDelPrefijo('arrancar_pruebas_plantilla', prefijo)).toBe(true);
    expect(esBaseDePruebasDelPrefijo('arrancar_pruebas_1', prefijo)).toBe(true);
    expect(esBaseDePruebasDelPrefijo('arrancar_pruebas_12', prefijo)).toBe(true);
  });

  it('no toca la base del prefijo, la de desarrollo ni las de otros prefijos', () => {
    for (const ajena of [
      'arrancar',
      'arrancar_pruebas',
      'arrancar_pruebas_par_1',
      'arrancar_pruebas_par_plantilla',
      'arrancar_pruebas_',
      'arrancar_pruebas_1a',
      'arrancar_pruebas_1x',
      'otra_arrancar_pruebas_1',
      'postgres',
    ]) {
      expect(esBaseDePruebasDelPrefijo(ajena, prefijo)).toBe(false);
    }
  });

  it('un prefijo con caracteres de expresión regular nunca se trata como patrón', () => {
    expect(esBaseDePruebasDelPrefijo('arrancar', 'x|^arrancar$|y')).toBe(false);
    expect(esBaseDePruebasDelPrefijo('arrancar_pruebas_1', 'arrancar_pruebas|x')).toBe(false);
  });
});
