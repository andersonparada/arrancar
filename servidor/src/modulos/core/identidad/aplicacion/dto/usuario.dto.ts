import type { OrigenDelPermiso } from '../permisos-efectivos.js';

export interface EmpresaDeUsuarioDto {
  empresaId: string;
  empresaNombre: string;
}

export interface RolDeUsuarioDto {
  rolId: string;
  rolNombre: string;
  accesoTotal: boolean;
}

/** Un usuario de la cuenta con las empresas donde trabaja y lo que puede hacer. */
export interface UsuarioDto {
  id: string;
  usuario: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  activo: boolean;
  ultimoAccesoEn: Date | null;
  empresas: EmpresaDeUsuarioDto[];
  roles: RolDeUsuarioDto[];
  totalPermisosDirectos: number;
}

export interface NombresDePersona {
  nombres: string;
  apellidos: string;
  /** Escrito a mano; si falta, se genera a partir de nombres y apellidos. */
  usuario?: string | undefined;
}

export interface SolicitudDeUsuario extends NombresDePersona {
  correo: string | null;
  contrasena: string;
  empresaIds: string[];
  /** Solo los recibe quien tiene `usuarios.asignar-permisos`. */
  rolIds?: string[] | undefined;
  permisos?: string[] | undefined;
  /** Si quien crea tiene `usuarios.asignar-permisos`. */
  puedeAsignarPermisos: boolean;
}

export interface SolicitudDeCambioDeUsuario {
  nombres?: string | undefined;
  apellidos?: string | undefined;
  correo?: string | null | undefined;
  activo?: boolean | undefined;
  empresaIds?: string[] | undefined;
}

export interface PermisoEfectivoDto {
  clave: string;
  descripcion: string;
  modulo: string;
  origenes: OrigenDelPermiso[];
  /** Si el módulo del permiso está activo en la cuenta; si no, el permiso no vale por ahora. */
  moduloActivo: boolean;
}

/** Los roles y permisos directos de un usuario y de dónde viene cada permiso que tiene. */
export interface PermisosDeUsuarioDto {
  roles: RolDeUsuarioDto[];
  directos: string[];
  efectivos: PermisoEfectivoDto[];
}

export interface SolicitudDeAsignaciones {
  rolIds: string[];
  permisos: string[];
}
