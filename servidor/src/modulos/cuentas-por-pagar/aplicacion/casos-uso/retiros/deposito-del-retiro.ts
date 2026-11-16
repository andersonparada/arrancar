import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { RetiroDeEfectivo } from '../../../dominio/retiros.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-pagos.js';
import { MODULO_DE_ORIGEN } from '../pagos/orden-a-bancos.js';
import type { DependenciasDeRetiros } from './dependencias-de-retiros.js';

/** Lo que hace falta para depositar lo que sobró: el retiro, lo que el usuario pidió y lo ya revisado. */
export interface DepositoPorHacer {
  retiro: RetiroDeEfectivo;
  pedido: { cuentaBancariaId?: string; referencia?: string | null };
  liquidacion: { fecha: string; devueltoCentavos: number };
}

/**
 * La orden a Bancos de la nota de crédito con lo que se devuelve (a nombre del custodio, con el retiro como origen y el
 * concepto «Devolución de efectivo para pagos»); sin devolución no hay nada que ordenar. Si Bancos lanza, nada cambia.
 */
export async function depositarElSobrante(
  dependencias: Pick<DependenciasDeRetiros, 'bancos' | 'movimientos'>,
  operador: Operador,
  { retiro, pedido, liquidacion }: DepositoPorHacer,
): Promise<MovimientoCreado | null> {
  if (liquidacion.devueltoCentavos === 0) return null;
  const delRetiro = await dependencias.movimientos.datosDe(retiro.movimientoId);
  return dependencias.bancos.registrarNotaDeCredito(operador, {
    origen: { modulo: MODULO_DE_ORIGEN, documentoId: retiro.id },
    cuentaBancariaId: pedido.cuentaBancariaId ?? delRetiro!.cuentaBancariaId,
    fecha: liquidacion.fecha,
    montoCentavos: liquidacion.devueltoCentavos,
    beneficiario: retiro.custodio,
    conceptos: [{ claveDeSistema: 'devolucion_de_efectivo_para_pagos', montoCentavos: liquidacion.devueltoCentavos }],
    ...(pedido.referencia ? { referencia: pedido.referencia } : {}),
  });
}
