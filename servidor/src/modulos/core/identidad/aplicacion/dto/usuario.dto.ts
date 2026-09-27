import type { AccesoAEmpresa } from '../../dominio/acceso-a-empresa.js';

export interface AccesoDto extends AccesoAEmpresa {
  empresaNombre: string;
  rolNombre: string;
}

/** Un usuario de la cuenta con las empresas donde trabaja. */
export interface UsuarioDto {
  id: string;
  usuario: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  activo: boolean;
  ultimoAccesoEn: Date | null;
  accesos: AccesoDto[];
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
  accesos: AccesoAEmpresa[];
}

export interface SolicitudDeCambioDeUsuario {
  nombres?: string | undefined;
  apellidos?: string | undefined;
  correo?: string | null | undefined;
  activo?: boolean | undefined;
  accesos?: AccesoAEmpresa[] | undefined;
}
