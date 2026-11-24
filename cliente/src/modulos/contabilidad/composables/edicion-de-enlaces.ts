import type { Cuenta } from '../servicios/cuentas.api';
import type { Enlace, LlaveDeEnlace, RolDeEnlace } from '../servicios/enlaces.api';

/** Los módulos que usan roles, en el orden en que se muestran, con su nombre. */
const MODULOS: [clave: string, nombre: string][] = [
  ['contabilidad', 'Contabilidad'],
  ['libro-de-compras', 'Libro de compras'],
  ['cuentas-por-pagar', 'Cuentas por pagar'],
  ['bancos', 'Bancos'],
  ['caja-chica', 'Caja chica'],
  ['cuentas-por-liquidar', 'Cuentas por liquidar'],
  ['activos-fijos', 'Activos fijos'],
];

/** Una fila de enlace: un rol entero o uno de los registros de otro módulo (cuenta bancaria, concepto…). */
export interface FilaDeEnlace {
  /** Id del registro del otro módulo; `null` = rige para todo el rol. */
  llave: string | null;
  nombre: string;
  enlace: Enlace | null;
  /** El registro ya no lo ofrece su módulo (se borró o el módulo se desactivó), pero el enlace sigue. */
  huerfana: boolean;
  /** Le falta cuenta y la necesita. */
  falta: boolean;
}

export interface GrupoDeRoles {
  clave: string;
  nombre: string;
  roles: RolDeEnlace[];
}

const nombreDelModulo = (clave: string): string => MODULOS.find(([c]) => c === clave)?.[1] ?? clave;

/** Los roles agrupados por el primer módulo que los usa, en el orden de la lista y por nombre dentro de cada grupo. */
export function agruparPorModulo(roles: RolDeEnlace[]): GrupoDeRoles[] {
  const grupos = new Map<string, RolDeEnlace[]>();
  for (const rol of roles) {
    const clave = rol.modulos[0] ?? 'contabilidad';
    grupos.set(clave, [...(grupos.get(clave) ?? []), rol]);
  }
  const orden = (clave: string) => MODULOS.findIndex(([c]) => c === clave);
  return [...grupos.entries()]
    .sort(([a], [b]) => (orden(a) < 0 ? 99 : orden(a)) - (orden(b) < 0 ? 99 : orden(b)))
    .map(([clave, deLosRoles]) => ({
      clave,
      nombre: nombreDelModulo(clave),
      roles: [...deLosRoles].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    }));
}

/** Las llaves activas que no tienen enlace propio. */
const llavesSinEnlace = (rol: RolDeEnlace, llaves: LlaveDeEnlace[]): LlaveDeEnlace[] =>
  llaves.filter((llave) => llave.activo && !rol.enlaces.some((enlace) => enlace.llave === llave.llave));

const enlaceDe = (rol: RolDeEnlace, llave: string | null): Enlace | null =>
  rol.enlaces.find((enlace) => enlace.llave === llave) ?? null;

/** Una fila por cada registro que el otro módulo ofrece (los inactivos solo si ya tienen enlace). */
function filasDeLlaves(rol: RolDeEnlace, llaves: LlaveDeEnlace[]): FilaDeEnlace[] {
  const general = enlaceDe(rol, null);
  return llaves
    .filter((llave) => llave.activo || enlaceDe(rol, llave.llave))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map((llave) => {
      const enlace = enlaceDe(rol, llave.llave);
      return { llave: llave.llave, nombre: llave.nombre, enlace, huerfana: false, falta: !enlace && !general };
    });
}

/** Los enlaces cuyo registro ya no ofrece su módulo. */
const filasHuerfanas = (rol: RolDeEnlace, llaves: LlaveDeEnlace[]): FilaDeEnlace[] =>
  rol.enlaces
    .filter((enlace) => enlace.llave !== null && !llaves.some((llave) => llave.llave === enlace.llave))
    .map((enlace) => ({
      llave: enlace.llave,
      nombre: enlace.llaveNombre ?? 'Registro desconocido',
      enlace,
      huerfana: true,
      falta: false,
    }));

/** Las filas de un rol: la general y, si lleva llave, una por cada registro del otro módulo y los enlaces huérfanos. */
export function filasDeRol(rol: RolDeEnlace, llaves: LlaveDeEnlace[]): FilaDeEnlace[] {
  const general = enlaceDe(rol, null);
  if (!rol.admiteLlave)
    return [{ llave: null, nombre: rol.nombre, enlace: general, huerfana: false, falta: general === null }];
  const filaGeneral: FilaDeEnlace = {
    llave: null,
    nombre: 'Todos (cuando no hay una cuenta específica)',
    enlace: general,
    huerfana: false,
    falta: general === null && llavesSinEnlace(rol, llaves).length > 0,
  };
  return [filaGeneral, ...filasDeLlaves(rol, llaves), ...filasHuerfanas(rol, llaves)];
}

/** Cuántas cuentas faltan por elegir en un rol. */
export function faltantesDelRol(rol: RolDeEnlace, llaves: LlaveDeEnlace[]): number {
  if (!rol.admiteLlave) return rol.enlaces.length === 0 ? 1 : 0;
  const general = rol.enlaces.some((enlace) => enlace.llave === null);
  return general ? 0 : llavesSinEnlace(rol, llaves).length;
}

/** El total de cuentas que faltan por elegir en todos los roles. */
export function totalDeFaltantes(roles: RolDeEnlace[], llavesPorRol: Record<string, LlaveDeEnlace[]>): number {
  return roles.reduce((suma, rol) => suma + faltantesDelRol(rol, llavesPorRol[rol.rol] ?? []), 0);
}

/** Los roles de auxiliar que usan la cuenta: si deja de ser de control, el auxiliar queda sin su cuenta de control. */
export function rolesDeAuxiliarDeLaCuenta(roles: RolDeEnlace[], cuentaId: string): string[] {
  return roles
    .filter((rol) => rol.esDeAuxiliar && rol.enlaces.some((enlace) => enlace.cuentaId === cuentaId))
    .map((rol) => rol.nombre)
    .sort((a, b) => a.localeCompare(b, 'es'));
}

/** Las cuentas que se pueden enlazar (de detalle y activas), por nombre. */
export function cuentasEnlazables(cuentas: Cuenta[]): Cuenta[] {
  return cuentas
    .filter((cuenta) => cuenta.esDeDetalle && cuenta.activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
