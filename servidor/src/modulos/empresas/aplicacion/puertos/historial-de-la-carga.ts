import type {
  CierreDeCargaInicialDto,
  EntradaDelHistorialDeCargaDto,
  UltimoCierreDto,
} from '../dto/historial-de-carga.dto.js';

/**
 * Lo que quedó en la auditoría de la carga inicial de una empresa: cierres, reaperturas y cambios del balance de
 * apertura. Solo lee. Corre dentro de la transacción de quien llama (con la empresa de la carga como contexto).
 */
export interface HistorialDeLaCarga {
  /** El último cierre guardado, o `null` si no hay ninguno (por ejemplo, una carga cerrada antes de EM-2). */
  ultimoCierre(empresaId: string): Promise<UltimoCierreDto | null>;
  /** De la más nueva a la más vieja. */
  listar(empresaId: string): Promise<EntradaDelHistorialDeCargaDto[]>;
  /** La revisión guardada de un cierre; `null` si el id no es un cierre de esa carga. */
  cierre(empresaId: string, cierreId: string): Promise<CierreDeCargaInicialDto | null>;
}
