/** Un rol del usuario con lo que da: sus permisos sueltos o el acceso total. */
export interface RolConPermisos {
  rolId: string;
  nombre: string;
  accesoTotal: boolean;
  permisos: readonly string[];
}

/** Lo que un usuario tiene asignado en una cuenta: sus roles y sus permisos directos. */
export interface AsignacionesDelUsuario {
  roles: readonly RolConPermisos[];
  directos: readonly string[];
}

/** De dónde le llega un permiso al usuario. */
export type OrigenDelPermiso =
  { tipo: 'rol'; rolId: string; rolNombre: string } | { tipo: 'acceso-total'; rolNombre: string } | { tipo: 'directo' };

interface EntradaDePermisos extends AsignacionesDelUsuario {
  /** Los permisos de los módulos activos de la cuenta. */
  disponibles: ReadonlySet<string>;
  /** Los que solo puede tener el superacceso: nadie más los recibe, ni por rol ni directos. */
  restringidos: ReadonlySet<string>;
}

/**
 * Los permisos con que trabaja un usuario: la unión de los de sus roles y sus permisos
 * directos, limitada a los módulos activos y sin los de superacceso. Un rol con acceso
 * total da todos los disponibles; solo un rol lo da (no hay permiso directo de acceso total).
 */
export function permisosEfectivos(entrada: EntradaDePermisos): { permisos: Set<string>; accesoTotal: boolean } {
  const { roles, directos, disponibles, restringidos } = entrada;
  const accesoTotal = roles.some((rol) => rol.accesoTotal);
  const asignados = accesoTotal ? disponibles : new Set([...roles.flatMap((rol) => rol.permisos), ...directos]);
  const permisos = new Set([...asignados].filter((p) => disponibles.has(p) && !restringidos.has(p)));
  return { permisos, accesoTotal };
}

/**
 * Cada vía por la que el usuario tiene el permiso: los roles que lo traen, el acceso total
 * de algún rol (solo si el módulo está activo) o su asignación directa.
 */
export function origenesDelPermiso(
  permiso: string,
  { roles, directos }: AsignacionesDelUsuario,
  moduloActivo: boolean,
): OrigenDelPermiso[] {
  const origenes: OrigenDelPermiso[] = [];
  for (const rol of roles) {
    if (rol.accesoTotal && moduloActivo) origenes.push({ tipo: 'acceso-total', rolNombre: rol.nombre });
    else if (rol.permisos.includes(permiso)) origenes.push({ tipo: 'rol', rolId: rol.rolId, rolNombre: rol.nombre });
  }
  if (directos.includes(permiso)) origenes.push({ tipo: 'directo' });
  return origenes;
}
