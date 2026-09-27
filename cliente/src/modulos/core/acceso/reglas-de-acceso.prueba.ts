import { describe, expect, it } from 'vitest';
import type { RouteMeta } from 'vue-router';
import { resolverAcceso, type SesionParaAcceso } from './reglas-de-acceso';

const sesion = (cambios: Partial<SesionParaAcceso> = {}): SesionParaAcceso => ({
  autenticado: true,
  esSuperacceso: false,
  empresa: { id: 'e1' },
  puede: () => true,
  ...cambios,
});
const ir = (meta: RouteMeta, name = 'pagina') => ({ meta, name, fullPath: '/pagina' });

describe('reglas de acceso', () => {
  it('sin sesión lleva a iniciar sesión y recuerda a dónde iba', () => {
    expect(resolverAcceso(ir({}), sesion({ autenticado: false }))).toEqual({
      name: 'iniciar-sesion',
      query: { volver: '/pagina' },
    });
  });

  it('quien ya inició sesión no vuelve a la pantalla de inicio de sesión', () => {
    expect(resolverAcceso(ir({ publica: true }, 'iniciar-sesion'), sesion())).toEqual({ name: 'inicio' });
  });

  it('sin empresa elegida pide elegirla, salvo en pantallas que no la necesitan', () => {
    expect(resolverAcceso(ir({}), sesion({ empresa: null }))).toEqual({ name: 'elegir-empresa' });
    expect(resolverAcceso(ir({ requiereEmpresa: false }), sesion({ empresa: null }))).toBe(true);
  });

  it('sin el permiso o sin superacceso muestra "sin permiso"', () => {
    expect(resolverAcceso(ir({ permiso: 'roles.ver' }), sesion({ puede: () => false }))).toEqual({
      name: 'sin-permiso',
    });
    expect(resolverAcceso(ir({ soloSuperacceso: true }), sesion())).toEqual({ name: 'sin-permiso' });
  });

  it('con todo en regla, entra', () => {
    expect(resolverAcceso(ir({ permiso: 'roles.ver' }), sesion())).toBe(true);
  });
});
