import type { DestinoDeLoNoLiquidado } from '../../../dominio/anticipos.js';

/** Con qué se reembolsa lo gastado de más: un cheque a nombre del beneficiario o una nota de débito. */
export type ReembolsoPedido =
  | { forma: 'cheque'; chequeraId: string; chequeId?: string; noNegociable?: boolean }
  | { forma: 'nota_de_debito'; cuentaBancariaId: string; referencia?: string | null };

/** Lo que pide quien liquida; el dinero va como texto con dos decimales. */
export interface PeticionParaLiquidarAnticipo {
  anticipoId: string;
  /** `AAAA-MM-DD`: hoy si falta; ni futura ni anterior a la entrega o al último gasto. */
  fecha?: string;
  /** Lo que se deposita de vuelta. */
  devuelto: string;
  /** La cuenta del depósito; por omisión la de la entrega. */
  cuentaBancariaId?: string;
  /** El número de la boleta de depósito. */
  referencia?: string | null;
  /** Lo que el beneficiario no justificó ni devolvió. */
  noLiquidado: string;
  destinoDeNoLiquidado?: DestinoDeLoNoLiquidado | null;
  /** Solo al cobrar: 5 o más, salvo `pagoVoluntario`. */
  cuotas?: number | null;
  pagoVoluntario?: boolean;
  motivoDeNoLiquidado?: string | null;
  /** Obligatorio solo si se gastó de más. */
  reembolso?: ReembolsoPedido | null;
}
