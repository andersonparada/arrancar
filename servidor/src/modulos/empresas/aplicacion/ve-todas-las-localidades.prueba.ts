import { describe, expect, it } from 'vitest';
import { veTodasLasLocalidades } from './ve-todas-las-localidades.js';

const rol = (accesoTotal: boolean, permisos: string[] = []) => ({ rolId: 'r', nombre: 'Rol', accesoTotal, permisos });

describe('veTodasLasLocalidades', () => {
  it('sí con un rol de acceso total, con ver-todas en un rol o como permiso directo', () => {
    expect(veTodasLasLocalidades({ roles: [rol(true)], directos: [] })).toBe(true);
    expect(veTodasLasLocalidades({ roles: [rol(false, ['empresas.localidades.ver-todas'])], directos: [] })).toBe(true);
    expect(veTodasLasLocalidades({ roles: [], directos: ['empresas.localidades.ver-todas'] })).toBe(true);
  });

  it('no con solo ver, o sin nada', () => {
    expect(veTodasLasLocalidades({ roles: [rol(false, ['empresas.localidades.ver'])], directos: [] })).toBe(false);
    expect(veTodasLasLocalidades({ roles: [], directos: [] })).toBe(false);
  });
});
