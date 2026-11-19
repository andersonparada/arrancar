import { describe, expect, it } from 'vitest';
import { veTodasLasBodegas } from './ve-todas-las-bodegas.js';

const rol = (accesoTotal: boolean, permisos: string[] = []) => ({ rolId: 'r', nombre: 'Rol', accesoTotal, permisos });

describe('veTodasLasBodegas', () => {
  it('sí con un rol de acceso total, con ver-todas en un rol o como permiso directo', () => {
    expect(veTodasLasBodegas({ roles: [rol(true)], directos: [] })).toBe(true);
    expect(veTodasLasBodegas({ roles: [rol(false, ['inventarios.bodegas.ver-todas'])], directos: [] })).toBe(true);
    expect(veTodasLasBodegas({ roles: [], directos: ['inventarios.bodegas.ver-todas'] })).toBe(true);
  });

  it('no con solo ver, o sin nada', () => {
    expect(veTodasLasBodegas({ roles: [rol(false, ['inventarios.bodegas.ver'])], directos: [] })).toBe(false);
    expect(veTodasLasBodegas({ roles: [], directos: [] })).toBe(false);
  });
});
