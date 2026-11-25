import type { DatosFiscalesDeLaVenta } from '../../dominio/costo-fiscal-de-control.js';

/** Lee los datos fiscales de la empresa con la vigencia de una fecha (tipo de persona y regímenes de IVA e ISR). */
export interface LectorDeDatosFiscales {
  /** Los de la vigencia de la fecha; todo `null` si la empresa no tiene datos fiscales. */
  en(fecha: string): Promise<DatosFiscalesDeLaVenta>;
}
