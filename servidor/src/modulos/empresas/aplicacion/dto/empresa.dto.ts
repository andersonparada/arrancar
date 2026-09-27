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

/** Lo que se recibe para registrar o cambiar una empresa, ya validado en su forma. */
export interface SolicitudDeEmpresa {
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  activa: boolean;
}
