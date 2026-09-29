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
  /** La conciliación donde quedó marcada cada nota; `null` si sigue pendiente. */
  conciliacionOrigenId: string | null;
  conciliacionDestinoId: string | null;
  /** Lo calcula el servidor (ver `accionesDeTransferencia`): si se puede anular con sus dos inversos. */
  puedeAnular: boolean;
  /** Lo calcula el servidor: si se puede eliminar de verdad (sus dos notas están limpias). */
  puedeEliminar: boolean;
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
  | 'conciliacionOrigenId'
  | 'conciliacionDestinoId'
  | 'puedeAnular'
  | 'puedeEliminar'
>;

/** Qué transferencias listar: de una cuenta (como origen o como destino) y entre dos fechas (incluidas); incluye anuladas. */
export interface FiltroDeTransferencias {
  cuentaBancariaId?: string;
  desde?: string;
  hasta?: string;
}
