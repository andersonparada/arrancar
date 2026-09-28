/** Transferencia tal como la ve el usuario en pantalla, con el nombre de sus dos cuentas y sus dos notas. */
export interface TransferenciaDto {
  id: string;
  cuentaOrigenId: string;
  cuentaOrigenNombre: string | null;
  cuentaDestinoId: string;
  cuentaDestinoNombre: string | null;
  fecha: string;
  monto: string;
  referencia: string | null;
  observaciones: string | null;
  anuladaEn: string | null;
  motivoDeAnulacion: string | null;
  movimientoOrigenId: string;
  movimientoDestinoId: string;
}

/** Lo que se recibe para registrar una transferencia, ya validado en su forma. */
export type SolicitudDeTransferencia = Omit<
  TransferenciaDto,
  | 'id'
  | 'cuentaOrigenNombre'
  | 'cuentaDestinoNombre'
  | 'anuladaEn'
  | 'motivoDeAnulacion'
  | 'movimientoOrigenId'
  | 'movimientoDestinoId'
>;
