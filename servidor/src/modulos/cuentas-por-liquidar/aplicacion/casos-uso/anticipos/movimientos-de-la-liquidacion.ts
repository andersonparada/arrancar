import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { MODULO_DE_ORIGEN, numeroDelAnticipo, type Anticipo } from '../../../dominio/anticipos.js';
import { ReembolsoSinMedioDePago } from '../../../dominio/errores-de-liquidacion.js';
import { beneficiarioDelCheque } from '../../../dominio/reglas-del-anticipo.js';
import type { LiquidacionRevisada } from '../../../dominio/liquidacion-del-anticipo.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-bancos.js';
import type { RepartoDeLosGastos } from '../../puertos/puertos-de-anticipos.js';
import type { DependenciasDeAnticipos } from './dependencias-de-anticipos.js';
import { conceptosDelReembolso } from './desglose-del-anticipo.js';
import type { PeticionParaLiquidarAnticipo } from './peticion-de-liquidacion.js';

/** Lo que Bancos creó al liquidar: el depósito de lo devuelto y el reembolso de lo gastado de más (a lo sumo uno de los dos). */
export interface MovimientosDeLaLiquidacion {
  deposito: MovimientoCreado | null;
  reembolso: MovimientoCreado | null;
}

/** Todo lo que hace falta para ordenar los movimientos de la liquidación. */
export interface LiquidacionPorOrdenar {
  anticipo: Anticipo;
  pedido: PeticionParaLiquidarAnticipo;
  revisada: LiquidacionRevisada;
  gastos: RepartoDeLosGastos;
  fecha: string;
}

type Dependencias = Pick<DependenciasDeAnticipos, 'bancos' | 'movimientos'>;

/** Lo común al cheque y a la nota del reembolso: a nombre del beneficiario, con el reparto por concepto de lo gastado de más. */
function datosDelReembolso({ anticipo, revisada, gastos, fecha }: LiquidacionPorOrdenar) {
  return {
    origen: { modulo: MODULO_DE_ORIGEN, documentoId: anticipo.id },
    fecha,
    montoCentavos: revisada.reembolsadoCentavos,
    beneficiario: beneficiarioDelCheque(anticipo.beneficiario),
    conceptos: conceptosDelReembolso(anticipo.montoCentavos, gastos),
    observaciones: `Reembolso del anticipo ${numeroDelAnticipo(anticipo.numero, anticipo.anioDeNumero)}`,
  };
}

/** @throws ReembolsoSinMedioDePago si se gastó de más y no se dijo cómo reembolsar. */
async function ordenarElReembolso(
  { bancos }: Dependencias,
  operador: Operador,
  por: LiquidacionPorOrdenar,
): Promise<MovimientoCreado | null> {
  if (por.revisada.reembolsadoCentavos === 0) return null;
  const medio = por.pedido.reembolso;
  if (!medio) throw new ReembolsoSinMedioDePago();
  const comun = datosDelReembolso(por);
  if (medio.forma === 'nota_de_debito') {
    const referencia = medio.referencia ? { referencia: medio.referencia } : {};
    return bancos.registrarNotaDeDebito(operador, {
      ...comun,
      ...referencia,
      cuentaBancariaId: medio.cuentaBancariaId,
    });
  }
  return bancos.emitirCheque(operador, {
    ...comun,
    ...(medio.chequeId ? { chequeId: medio.chequeId } : {}),
    chequeraId: medio.chequeraId,
    noNegociable: medio.noNegociable ?? true,
  });
}

/** La nota de crédito con lo que se devuelve; en la cuenta de la entrega si no se escribió otra. */
async function ordenarElDeposito(
  { bancos, movimientos }: Dependencias,
  operador: Operador,
  { anticipo, pedido, revisada, fecha }: LiquidacionPorOrdenar,
): Promise<MovimientoCreado | null> {
  if (revisada.devueltoCentavos === 0) return null;
  const cuentaBancariaId =
    pedido.cuentaBancariaId ?? (await movimientos.datosDe(anticipo.movimientoId))?.cuentaBancariaId ?? '';
  return bancos.registrarNotaDeCredito(operador, {
    origen: { modulo: MODULO_DE_ORIGEN, documentoId: anticipo.id },
    cuentaBancariaId,
    fecha,
    montoCentavos: revisada.devueltoCentavos,
    beneficiario: anticipo.beneficiario,
    conceptos: [{ claveDeSistema: 'devolucion_de_anticipo', montoCentavos: revisada.devueltoCentavos }],
    ...(pedido.referencia ? { referencia: pedido.referencia } : {}),
  });
}

/**
 * Las órdenes a Bancos de la liquidación (§7.3): la devolución (nota de crédito, concepto «Devolución de anticipo») o el
 * reembolso de lo gastado de más (cheque a nombre del beneficiario o nota de débito, concepto de gasto). Si Bancos lanza,
 * nada cambia.
 */
export async function ordenarLosMovimientos(
  dependencias: Dependencias,
  operador: Operador,
  por: LiquidacionPorOrdenar,
): Promise<MovimientosDeLaLiquidacion> {
  const deposito = await ordenarElDeposito(dependencias, operador, por);
  const reembolso = await ordenarElReembolso(dependencias, operador, por);
  return { deposito, reembolso };
}
