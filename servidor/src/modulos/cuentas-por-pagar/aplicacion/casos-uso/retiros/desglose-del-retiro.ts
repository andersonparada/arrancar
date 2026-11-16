import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { LineaDeConcepto } from '../../../../core/contratos/bancos.contratos.js';
import type { RetiroDeEfectivo } from '../../../dominio/retiros.js';
import { MODULO_DE_ORIGEN, repartoPorActivo } from '../pagos/orden-a-bancos.js';
import type { DependenciasDeRetiros } from './dependencias-de-retiros.js';

/**
 * El reparto por concepto del cheque o la nota del retiro: lo pagado en efectivo va a Operación o a Inversión según sus
 * cargos, el faltante a «Faltante de efectivo» (Operación) y el resto (lo que sigue en el retiro y lo devuelto) a «Efectivo
 * para pagos» (sin flujo). Sin líneas en cero.
 */
export function conceptosDelDesglose(
  retiro: Pick<RetiroDeEfectivo, 'montoCentavos' | 'faltanteCentavos'>,
  pagado: { totalCentavos: number; deActivoCentavos: number },
): LineaDeConcepto[] {
  const conceptos: LineaDeConcepto[] = [
    ...repartoPorActivo(pagado.totalCentavos, pagado.deActivoCentavos),
    { claveDeSistema: 'faltante_de_efectivo', montoCentavos: retiro.faltanteCentavos },
    {
      claveDeSistema: 'efectivo_para_pagos',
      montoCentavos: retiro.montoCentavos - pagado.totalCentavos - retiro.faltanteCentavos,
    },
  ];
  return conceptos.filter(({ montoCentavos }) => montoCentavos > 0);
}

/**
 * Vuelve a fijar en Bancos el reparto por concepto del movimiento del retiro (idempotente). Se llama al liquidarlo y
 * reabrirlo (y, con los pagos en efectivo, al registrar, anular o reaplicar uno); quien llama ya bloqueó el movimiento.
 */
export class DesgloseDelRetiro {
  constructor(private readonly dependencias: Pick<DependenciasDeRetiros, 'consultas' | 'bancos'>) {}

  async fijar(operador: Operador, retiro: RetiroDeEfectivo): Promise<void> {
    const { consultas, bancos } = this.dependencias;
    const pagado = await consultas.repartoDelRetiro(retiro.id);
    await bancos.fijarDesglose(operador, {
      origen: { modulo: MODULO_DE_ORIGEN, documentoId: retiro.id },
      movimientoId: retiro.movimientoId,
      conceptos: conceptosDelDesglose(retiro, pagado),
    });
  }
}
