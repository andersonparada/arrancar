import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PagoConLineas } from '../../../dominio/pago-con-lineas.js';
import { DesgloseDelRetiro } from '../retiros/desglose-del-retiro.js';
import type { DependenciasDeCambiarPagos } from './dependencias-de-pagos.js';

type Dependencias = Pick<DependenciasDeCambiarPagos, 'bancos' | 'retiros' | 'consultasDeRetiros'>;

/**
 * El cheque o la nota de un retiro lleva el reparto de lo pagado en efectivo (Operación, Inversión, faltante y «efectivo para
 * pagos»). Al anular o reaplicar un pago en efectivo se vuelve a fijar con lo que los pagos vigentes del retiro suman hoy
 * (idempotente); con cualquier otra forma no hace nada. Quien llama ya bloqueó el cheque o la nota y el retiro.
 */
export class DesgloseDelPagoEnEfectivo {
  constructor(private readonly dependencias: Dependencias) {}

  async fijar(operador: Operador, pago: Pick<PagoConLineas, 'retiroId'>): Promise<void> {
    if (pago.retiroId === null) return;
    const { retiros, consultasDeRetiros, bancos } = this.dependencias;
    const retiro = await retiros.buscar(pago.retiroId);
    await new DesgloseDelRetiro({ consultas: consultasDeRetiros, bancos }).fijar(operador, retiro!);
  }
}
