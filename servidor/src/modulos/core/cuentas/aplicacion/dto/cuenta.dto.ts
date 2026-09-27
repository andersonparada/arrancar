export interface CuentaDto {
  id: string;
  nombre: string;
  activa: boolean;
  creadoEn: Date;
  totalEmpresas: number;
}

/** Un módulo del catálogo y si la cuenta lo tiene activo. */
export interface EstadoDeModuloDto {
  clave: string;
  nombre: string;
  descripcion: string;
  esencial: boolean;
  dependeDe: string[];
  activo: boolean;
}

export interface SolicitudDeAlta {
  nombreCuenta: string;
  empresa: { nombre: string; nit: string | null };
  propietario: {
    nombres: string;
    apellidos: string;
    /** Vacío: se genera. Si ya existe, se reutiliza (alguien que ya es dueño de otra cuenta). */
    usuario?: string | undefined;
    correo: string | null;
    /** Obligatoria solo si el propietario es nuevo. */
    contrasena?: string | undefined;
  };
  modulos: string[];
}

export interface CuentaDadaDeAltaDto {
  cuenta: { id: string; nombre: string };
  empresa: { id: string; nombre: string };
  propietario: { id: string; usuario: string; existente: boolean };
}
