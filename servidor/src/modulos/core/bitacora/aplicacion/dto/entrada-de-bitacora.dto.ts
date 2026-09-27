/** Una entrada tal como la ve soporte en su panel. */
export interface EntradaDeBitacoraDto {
  id: string;
  accion: string;
  detalle: unknown;
  direccionIp: string | null;
  creadoEn: Date;
  usuarioNombre: string;
  empresaNombre: string | null;
}
