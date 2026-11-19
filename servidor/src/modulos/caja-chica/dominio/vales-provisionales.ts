/** El recurso de auditoría de los vales provisionales. */
export const RECURSO_DE_VALES_PROVISIONALES = 'caja-chica.vales-provisionales';

export type EstadoDelVale = 'abierto' | 'liquidado' | 'anulado';

/**
 * El efectivo que el custodio entrega desde el fondo a alguien para una compra, por justificar con documentos o vales de
 * gasto. Mientras está abierto cuenta como parte del fondo que no está en la caja.
 */
export interface ValeProvisional {
  id: string;
  fondoId: string;
  numero: number;
  anioDeNumero: number;
  fecha: string;
  entregadoA: string;
  entregadoAUsuarioId: string | null;
  montoCentavos: number;
  motivo: string;
  estado: EstadoDelVale;
  fechaDeLiquidacion: string | null;
  /** Lo que regresó al fondo al liquidar. */
  devueltoCentavos: number;
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
}
