import { describe, expect, it } from 'vitest';
import type { GrupoPermisos, Rol } from '../../servicios/roles.api';
import type { PermisosDeUsuario } from '../../servicios/usuarios.api';
import {
  catalogoDesdeEfectivos,
  daAccesoTotal,
  edicionDePermisos,
  gruposConOrigen,
  hayCambios,
  marcarGrupo,
  origenesDe,
  resumenDeCambios,
  rolConAccesoTotal,
  rolesDesdeEfectivos,
  soloLosQueTiene,
  solicitudDePermisos,
  textoDeOrigen,
  totalDePermisos,
} from './permisos-de-usuario';

const contador: Rol = {
  id: 'r1',
  nombre: 'Contador',
  descripcion: null,
  accesoTotal: false,
  permisos: ['bancos.ver'],
  totalUsuarios: 1,
};
const dueno: Rol = { ...contador, id: 'r2', nombre: 'Propietario', accesoTotal: true, permisos: [] };
const roles = [contador, dueno];
const catalogo: GrupoPermisos[] = [
  {
    modulo: 'bancos',
    nombre: 'Bancos',
    permisos: [
      { clave: 'bancos.ver', descripcion: 'Ver bancos' },
      { clave: 'bancos.crear', descripcion: 'Crear bancos' },
    ],
  },
  { modulo: 'terceros', nombre: 'Terceros', permisos: [{ clave: 'terceros.ver', descripcion: 'Ver terceros' }] },
];
const sinNada = { rolIds: [], directos: [] };

describe('origen de los permisos', () => {
  it('un rol da sus permisos, y un permiso directo suma su origen', () => {
    const edicion = { rolIds: ['r1'], directos: ['bancos.ver'] };

    expect(origenesDe('bancos.ver', [contador], edicion)).toEqual([
      { tipo: 'rol', rolId: 'r1', rolNombre: 'Contador' },
      { tipo: 'directo' },
    ]);
    expect(origenesDe('bancos.crear', [contador], edicion)).toEqual([]);
  });

  it('el rol de acceso total da todos los permisos', () => {
    expect(origenesDe('terceros.ver', [dueno], sinNada)).toEqual([{ tipo: 'acceso-total', rolNombre: 'Propietario' }]);
    expect(rolConAccesoTotal(roles, { rolIds: ['r2'], directos: [] })?.nombre).toBe('Propietario');
    expect(rolConAccesoTotal(roles, { rolIds: ['r1'], directos: [] })).toBeUndefined();
  });

  it('los textos de las insignias dicen el origen', () => {
    expect(textoDeOrigen({ tipo: 'directo' })).toBe('Directo');
    expect(textoDeOrigen({ tipo: 'rol', rolId: 'r1', rolNombre: 'Contador' })).toBe('Rol: Contador');
    expect(textoDeOrigen({ tipo: 'acceso-total', rolNombre: 'Propietario' })).toBe('Acceso total: Propietario');
  });
});

describe('grupos de permisos', () => {
  const edicion = { rolIds: ['r1'], directos: ['terceros.ver'] };

  it('bloquea los que da un rol y deja editables los directos', () => {
    const [bancos, terceros] = gruposConOrigen(catalogo, { roles, edicion });

    expect(bancos?.permisos.map((p) => [p.clave, p.marcado, p.bloqueado])).toEqual([
      ['bancos.ver', true, true],
      ['bancos.crear', false, false],
    ]);
    expect(terceros?.permisos[0]).toMatchObject({ marcado: true, bloqueado: false });
    expect(terceros?.todosMarcados).toBe(true);
  });

  it('un módulo inactivo se marca para verse en gris y no cuenta en el total', () => {
    const grupos = gruposConOrigen(catalogo, { roles, edicion, inactivos: new Set(['terceros']) });

    expect(grupos[1]?.permisos[0]?.moduloActivo).toBe(false);
    expect(totalDePermisos(grupos)).toBe(1);
  });

  it('marcar todos agrega solo los editables y desmarcar quita solo los directos', () => {
    const [bancos] = gruposConOrigen(catalogo, { roles, edicion });
    if (!bancos) throw new Error('falta el grupo');

    expect(marcarGrupo(edicion, bancos, true)).toEqual(['terceros.ver', 'bancos.crear']);
    expect(marcarGrupo({ ...edicion, directos: ['bancos.crear', 'terceros.ver'] }, bancos, false)).toEqual([
      'terceros.ver',
    ]);
  });

  it('«solo los que tiene» quita los grupos vacíos', () => {
    const grupos = soloLosQueTiene(gruposConOrigen(catalogo, { roles, edicion: { rolIds: ['r1'], directos: [] } }));

    expect(grupos.map((g) => g.modulo)).toEqual(['bancos']);
    expect(grupos[0]?.permisos.map((p) => p.clave)).toEqual(['bancos.ver']);
  });
});

describe('cambios', () => {
  const inicial = { rolIds: ['r1'], directos: ['terceros.ver'] };

  it('detecta cambios sin importar el orden', () => {
    expect(hayCambios(inicial, { rolIds: ['r1'], directos: ['terceros.ver'] })).toBe(false);
    expect(hayCambios(inicial, { rolIds: ['r1'], directos: [] })).toBe(true);
    expect(hayCambios(inicial, { rolIds: ['r1', 'r2'], directos: ['terceros.ver'] })).toBe(true);
  });

  it('el resumen dice qué roles y cuántos permisos cambian', () => {
    const actual = { rolIds: ['r2'], directos: ['terceros.ver', 'bancos.crear', 'bancos.ver'] };

    expect(resumenDeCambios(inicial, actual, roles)).toBe(
      'Se agrega el rol "Propietario"; se quita el rol "Contador"; se agregan 2 permisos directos. Los cambios valen desde su próxima petición.',
    );
    expect(daAccesoTotal(inicial, actual, roles)).toBe(true);
    expect(daAccesoTotal(inicial, inicial, roles)).toBe(false);
  });

  it('manda al servidor los roles y los permisos directos', () => {
    expect(solicitudDePermisos(inicial)).toEqual({ rolIds: ['r1'], permisos: ['terceros.ver'] });
  });
});

describe('sin permiso para ver roles', () => {
  const datos: PermisosDeUsuario = {
    roles: [{ rolId: 'r1', rolNombre: 'Contador', accesoTotal: false }],
    directos: ['terceros.ver'],
    efectivos: [
      {
        clave: 'bancos.ver',
        descripcion: 'Ver bancos',
        modulo: 'bancos',
        moduloActivo: true,
        origenes: [{ tipo: 'rol', rolId: 'r1', rolNombre: 'Contador' }],
      },
      {
        clave: 'terceros.ver',
        descripcion: 'Ver terceros',
        modulo: 'terceros',
        moduloActivo: true,
        origenes: [{ tipo: 'directo' }],
      },
    ],
  };

  it('arma los roles y el catálogo con lo que dijo el servidor', () => {
    expect(rolesDesdeEfectivos(datos)).toMatchObject([{ id: 'r1', permisos: ['bancos.ver'] }]);
    expect(catalogoDesdeEfectivos(datos).map((g) => g.modulo)).toEqual(['bancos', 'terceros']);
    expect(edicionDePermisos(datos)).toEqual({ rolIds: ['r1'], directos: ['terceros.ver'] });
  });
});
