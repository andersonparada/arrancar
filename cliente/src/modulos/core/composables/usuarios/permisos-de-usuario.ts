import type { Rol, GrupoPermisos } from '../../servicios/roles.api';
import type { OrigenDelPermiso, PermisosDeUsuario } from '../../servicios/usuarios.api';

/** Lo que se está editando en la página: los roles y los permisos directos elegidos. */
export interface EdicionDePermisos {
  rolIds: string[];
  directos: string[];
}

export interface PermisoConOrigen {
  clave: string;
  descripcion: string;
  origenes: OrigenDelPermiso[];
  /** Si algún rol lo da, se ve marcado pero no se desmarca aquí: se quita desde el rol. */
  bloqueado: boolean;
  /** Marcado por cualquier origen (rol, acceso total o directo). */
  marcado: boolean;
  moduloActivo: boolean;
}

export interface GrupoConOrigen {
  modulo: string;
  nombre: string;
  permisos: PermisoConOrigen[];
  /** Todos los que se pueden marcar aquí ya están marcados. */
  todosMarcados: boolean;
  /** Ninguno de los que se pueden marcar aquí está marcado. */
  ningunoMarcado: boolean;
}

export const edicionDePermisos = (datos: PermisosDeUsuario): EdicionDePermisos => ({
  rolIds: datos.roles.map((rol) => rol.rolId),
  directos: [...datos.directos],
});

/** Los roles elegidos, en orden de nombre. */
export const rolesElegidos = (roles: Rol[], edicion: EdicionDePermisos): Rol[] =>
  roles.filter((rol) => edicion.rolIds.includes(rol.id)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

/** El rol con acceso total elegido, si hay uno: entonces el usuario tiene todos los permisos. */
export const rolConAccesoTotal = (roles: Rol[], edicion: EdicionDePermisos): Rol | undefined =>
  rolesElegidos(roles, edicion).find((rol) => rol.accesoTotal);

/** De dónde vendría un permiso con los roles y permisos directos elegidos (vista previa; guarda el servidor). */
export function origenesDe(clave: string, elegidos: Rol[], edicion: EdicionDePermisos): OrigenDelPermiso[] {
  const origenes: OrigenDelPermiso[] = elegidos.flatMap((rol): OrigenDelPermiso[] => {
    if (rol.accesoTotal) return [{ tipo: 'acceso-total', rolNombre: rol.nombre }];
    return rol.permisos.includes(clave) ? [{ tipo: 'rol', rolId: rol.id, rolNombre: rol.nombre }] : [];
  });
  return edicion.directos.includes(clave) ? [...origenes, { tipo: 'directo' }] : origenes;
}

/** Con qué se calculan los orígenes: los roles de la cuenta, lo elegido y los módulos que no están activos. */
export interface VistaDePermisos {
  roles: Rol[];
  edicion: EdicionDePermisos;
  inactivos?: ReadonlySet<string>;
}

function permisoConOrigen(permiso: GrupoPermisos['permisos'][number], elegidos: Rol[], vista: VistaDePermisos) {
  const origenes = origenesDe(permiso.clave, elegidos, vista.edicion);
  return {
    clave: permiso.clave,
    descripcion: permiso.descripcion,
    origenes,
    bloqueado: origenes.some((origen) => origen.tipo !== 'directo'),
    marcado: origenes.length > 0,
  };
}

/** Los permisos del catálogo agrupados por módulo, cada uno con su origen. */
export function gruposConOrigen(catalogo: GrupoPermisos[], vista: VistaDePermisos): GrupoConOrigen[] {
  const elegidos = rolesElegidos(vista.roles, vista.edicion);
  return catalogo.map((grupo) => {
    const moduloActivo = !vista.inactivos?.has(grupo.modulo);
    const permisos = grupo.permisos.map((p) => ({ ...permisoConOrigen(p, elegidos, vista), moduloActivo }));
    const editables = permisos.filter((permiso) => !permiso.bloqueado);
    return {
      modulo: grupo.modulo,
      nombre: grupo.nombre,
      permisos,
      todosMarcados: editables.length > 0 && editables.every((permiso) => permiso.marcado),
      ningunoMarcado: editables.every((permiso) => !permiso.marcado),
    };
  });
}

/** Marca o desmarca de una vez los permisos directos del grupo; los que da un rol no se tocan. */
export function marcarGrupo(edicion: EdicionDePermisos, grupo: GrupoConOrigen, marcar: boolean): string[] {
  const editables = grupo.permisos.filter((permiso) => !permiso.bloqueado).map((permiso) => permiso.clave);
  const resto = edicion.directos.filter((clave) => !editables.includes(clave));
  return marcar ? [...resto, ...editables] : resto;
}

/** Cuántos permisos tiene el usuario con lo elegido (sin contar módulos inactivos). */
export const totalDePermisos = (grupos: GrupoConOrigen[]): number =>
  grupos.reduce((suma, grupo) => suma + grupo.permisos.filter((p) => p.marcado && p.moduloActivo).length, 0);

/** Los grupos con solo los permisos que el usuario tiene, sin los grupos que quedan vacíos. */
export const soloLosQueTiene = (grupos: GrupoConOrigen[]): GrupoConOrigen[] =>
  grupos
    .map((grupo) => ({ ...grupo, permisos: grupo.permisos.filter((permiso) => permiso.marcado) }))
    .filter((grupo) => grupo.permisos.length > 0);

const mismos = (a: string[], b: string[]) => a.length === b.length && a.every((valor) => b.includes(valor));

export const hayCambios = (inicial: EdicionDePermisos, actual: EdicionDePermisos): boolean =>
  !mismos(inicial.rolIds, actual.rolIds) || !mismos(inicial.directos, actual.directos);

export const solicitudDePermisos = (edicion: EdicionDePermisos) => ({
  rolIds: edicion.rolIds,
  permisos: edicion.directos,
});

/** El texto corto de una insignia de origen. */
export function textoDeOrigen(origen: OrigenDelPermiso): string {
  if (origen.tipo === 'directo') return 'Directo';
  return origen.tipo === 'acceso-total' ? `Acceso total: ${origen.rolNombre}` : `Rol: ${origen.rolNombre}`;
}

const diferencia = (nuevos: string[], antes: string[]) => nuevos.filter((valor) => !antes.includes(valor));

/** Lo que va a pasar al guardar, para la confirmación. */
export function resumenDeCambios(inicial: EdicionDePermisos, actual: EdicionDePermisos, roles: Rol[]): string {
  const nombre = (id: string) => roles.find((rol) => rol.id === id)?.nombre ?? id;
  const partes = [
    ...diferencia(actual.rolIds, inicial.rolIds).map((id) => `se agrega el rol "${nombre(id)}"`),
    ...diferencia(inicial.rolIds, actual.rolIds).map((id) => `se quita el rol "${nombre(id)}"`),
  ];
  const agregados = diferencia(actual.directos, inicial.directos).length;
  const quitados = diferencia(inicial.directos, actual.directos).length;
  if (agregados) partes.push(`se agregan ${agregados} permisos directos`);
  if (quitados) partes.push(`se quitan ${quitados} permisos directos`);
  const texto = partes.join('; ');
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}. Los cambios valen desde su próxima petición.`;
}

/** Si entre los roles que se agregan hay uno con acceso total, la confirmación es de cuidado. */
export const daAccesoTotal = (inicial: EdicionDePermisos, actual: EdicionDePermisos, roles: Rol[]): boolean =>
  diferencia(actual.rolIds, inicial.rolIds).some((id) => roles.find((rol) => rol.id === id)?.accesoTotal);

/** Los roles del usuario armados con lo que dijo el servidor, cuando no se puede pedir la lista de roles. */
export function rolesDesdeEfectivos(datos: PermisosDeUsuario): Rol[] {
  return datos.roles.map((rol) => ({
    id: rol.rolId,
    nombre: rol.rolNombre,
    descripcion: null,
    accesoTotal: rol.accesoTotal,
    totalUsuarios: 0,
    permisos: datos.efectivos
      .filter((permiso) => permiso.origenes.some((o) => o.tipo === 'rol' && o.rolId === rol.rolId))
      .map((permiso) => permiso.clave),
  }));
}

/** Los permisos que tiene el usuario agrupados por módulo, cuando no se puede pedir el catálogo completo. */
export function catalogoDesdeEfectivos(datos: PermisosDeUsuario): GrupoPermisos[] {
  const grupos = new Map<string, GrupoPermisos>();
  for (const { clave, descripcion, modulo } of datos.efectivos) {
    const grupo = grupos.get(modulo) ?? { modulo, nombre: modulo, permisos: [] };
    grupo.permisos.push({ clave, descripcion });
    grupos.set(modulo, grupo);
  }
  return [...grupos.values()];
}
