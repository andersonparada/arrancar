export interface RolDto {
  id: string;
  nombre: string;
  descripcion: string | null;
  accesoTotal: boolean;
  permisos: string[];
  totalUsuarios: number;
}

export interface SolicitudDeRol {
  nombre: string;
  descripcion?: string | null;
  accesoTotal: boolean;
  permisos: string[];
}

/** Los permisos de un módulo activo de la cuenta, para elegirlos al armar un rol. */
export interface GrupoDePermisosDto {
  modulo: string;
  nombre: string;
  permisos: { clave: string; descripcion: string }[];
}
