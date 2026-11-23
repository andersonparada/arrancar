import type { RolDeCuenta } from '../../../core/contratos/contabilidad.contratos.js';

/** Un enlace tal como lo ve el usuario: el rol, su llave y la cuenta elegida. */
export interface EnlaceDto {
  id: string;
  rol: RolDeCuenta;
  /** El id del registro del otro módulo; nulo = rige para todo el rol. */
  llave: string | null;
  /** El nombre con que se mostró al enlazar (sirve si el registro ya no existe). */
  llaveNombre: string | null;
  cuentaId: string;
  cuentaCodigo: string;
  cuentaNombre: string;
}

/** Un rol de sistema de los módulos activos, con lo que ya está enlazado. */
export interface RolDeEnlaceDto {
  rol: RolDeCuenta;
  nombre: string;
  modulos: readonly string[];
  admiteLlave: boolean;
  nombreDeLlave: string | null;
  esDeAuxiliar: boolean;
  enlaces: EnlaceDto[];
}

/** Lo que se recibe al enlazar un rol (la llave es el id del registro del otro módulo); ya validado en su forma. */
export interface SolicitudDeEnlace {
  llave: string | null;
  cuentaId: string;
}

/** Lo que se lee de una fila del Excel: la llave va por su nombre. */
export interface SolicitudDeEnlaceDeExcel {
  rol: RolDeCuenta;
  llaveNombre: string | null;
  cuentaId: string;
}
