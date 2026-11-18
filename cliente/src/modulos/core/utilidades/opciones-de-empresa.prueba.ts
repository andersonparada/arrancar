import { describe, expect, it } from 'vitest';
import { opcionesDeEmpresa, type EmpresaParaElegir } from './opciones-de-empresa';

const empresa = (id: string, nombre: string, cuenta = 'c1'): EmpresaParaElegir => ({
  id,
  nombre,
  cuentaId: cuenta,
  cuentaNombre: cuenta === 'c1' ? 'Agro' : 'Zona',
});

describe('opcionesDeEmpresa', () => {
  it('ordena por nombre sin distinguir tildes ni mayúsculas', () => {
    const opciones = opcionesDeEmpresa([empresa('1', 'Zeta'), empresa('2', 'álamo'), empresa('3', 'Beta')]);
    expect(opciones.map((o) => o.texto)).toEqual(['álamo', 'Beta', 'Zeta']);
  });

  it('no agrupa si todas son de una misma cuenta', () => {
    const opciones = opcionesDeEmpresa([empresa('1', 'A'), empresa('2', 'B')]);
    expect(opciones.every((o) => o.grupo === undefined)).toBe(true);
  });

  it('agrupa por cuenta, en orden, si hay más de una', () => {
    const opciones = opcionesDeEmpresa([
      empresa('1', 'Uno', 'c2'),
      empresa('2', 'Dos', 'c1'),
      empresa('3', 'Ana', 'c2'),
    ]);
    expect(opciones.map((o) => [o.grupo, o.texto])).toEqual([
      ['Agro', 'Dos'],
      ['Zona', 'Ana'],
      ['Zona', 'Uno'],
    ]);
  });

  it('usa el id como valor', () => {
    expect(opcionesDeEmpresa([empresa('abc', 'A')])[0]?.valor).toBe('abc');
  });
});
