import { describe, expect, it } from 'vitest';
import { origenesDelPermiso, permisosEfectivos, type RolConPermisos } from './permisos-efectivos.js';

const DISPONIBLES = new Set(['a.ver', 'a.crear', 'b.ver', 'config.gestionar']);
const RESTRINGIDOS = new Set(['config.gestionar']);

function rol(nombre: string, permisos: string[] = [], accesoTotal = false): RolConPermisos {
  return { rolId: `id-${nombre}`, nombre, accesoTotal, permisos };
}

function calcular(roles: RolConPermisos[], directos: string[] = []) {
  const { permisos, accesoTotal } = permisosEfectivos({
    roles,
    directos,
    disponibles: DISPONIBLES,
    restringidos: RESTRINGIDOS,
  });
  return { permisos: [...permisos].sort(), accesoTotal };
}

describe('permisosEfectivos', () => {
  it('une los permisos de dos roles', () => {
    expect(calcular([rol('A', ['a.ver']), rol('B', ['b.ver'])]).permisos).toEqual(['a.ver', 'b.ver']);
  });

  it('los permisos directos suman a los del rol', () => {
    expect(calcular([rol('A', ['a.ver'])], ['b.ver']).permisos).toEqual(['a.ver', 'b.ver']);
  });

  it('un solo rol con acceso total da todos los disponibles', () => {
    const resultado = calcular([rol('A', ['a.ver']), rol('Dueño', [], true)]);

    expect(resultado.accesoTotal).toBe(true);
    expect(resultado.permisos).toEqual(['a.crear', 'a.ver', 'b.ver']);
  });

  it('nunca da los de superacceso, ni directos ni por acceso total', () => {
    expect(calcular([rol('A')], ['config.gestionar']).permisos).toEqual([]);
    expect(calcular([rol('Dueño', [], true)]).permisos).not.toContain('config.gestionar');
  });

  it('ignora los permisos de módulos inactivos y las claves desconocidas', () => {
    expect(calcular([rol('A', ['x.ver'])], ['zzz.desconocido']).permisos).toEqual([]);
  });

  it('sin roles ni permisos no tiene nada, y sin acceso total', () => {
    expect(calcular([])).toEqual({ permisos: [], accesoTotal: false });
  });
});

describe('origenesDelPermiso', () => {
  const roles = [rol('Contador', ['a.ver']), rol('Bodega', ['a.ver']), rol('Dueño', [], true)];

  it('lista cada vía por la que llega el permiso', () => {
    const origenes = origenesDelPermiso('a.ver', { roles, directos: ['a.ver'] }, true);

    expect(origenes).toEqual([
      { tipo: 'rol', rolId: 'id-Contador', rolNombre: 'Contador' },
      { tipo: 'rol', rolId: 'id-Bodega', rolNombre: 'Bodega' },
      { tipo: 'acceso-total', rolNombre: 'Dueño' },
      { tipo: 'directo' },
    ]);
  });

  it('el acceso total no cuenta si el módulo del permiso no está activo', () => {
    expect(origenesDelPermiso('b.ver', { roles, directos: [] }, false)).toEqual([]);
  });
});
