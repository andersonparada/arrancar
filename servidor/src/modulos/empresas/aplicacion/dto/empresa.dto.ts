/** Empresa tal como la ve el usuario en pantalla. */
export interface EmpresaDto {
  id: string;
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  monedaBase: string;
  activa: boolean;
  actualizadoEn: Date;
}

/** La respuesta de registrar y de cambiar una empresa: la empresa y los avisos que no bloquean. */
export type EmpresaConAvisosDto = EmpresaDto & { avisos: string[] };

/** Lo que se recibe para registrar o cambiar una empresa, ya validado en su forma. */
export interface SolicitudDeEmpresa {
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  activa: boolean;
}
