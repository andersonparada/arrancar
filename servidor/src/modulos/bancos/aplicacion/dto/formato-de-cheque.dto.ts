import type { ClaveDePlantilla } from '../../dominio/formatos-de-cheque/plantillas.js';
import type { FormatoDeCheque } from '../../dominio/formatos-de-cheque/tipos.js';

/** Un formato de impresión de cheques de la cuenta, como lo ve la pantalla. */
export interface FormatoDeChequeDto {
  id: string;
  nombre: string;
  base: ClaveDePlantilla;
  /** Solo lo que difiere de la plantilla de fábrica. */
  ajustes: Record<string, unknown>;
  /** Cuándo se confirmó «la prueba quedó alineada»; `null` si nunca o si cambió después. */
  probadoEn: string | null;
  activo: boolean;
  /** Chequeras de la empresa activa que lo usan (las de otras empresas de la cuenta las frena la base al eliminar). */
  chequerasQueLoUsan: number;
}

/** El formato con todas sus medidas resueltas (plantilla + ajustes); `resuelto` es `null` si está dañado. */
export interface FormatoDeChequeDetalleDto extends FormatoDeChequeDto {
  resuelto: FormatoDeCheque | null;
  danado: boolean;
}

/** Lo que se recibe para crear o cambiar un formato, ya validado en su forma. */
export type SolicitudDeFormatoDeCheque = Pick<FormatoDeChequeDto, 'nombre' | 'base' | 'ajustes'>;
