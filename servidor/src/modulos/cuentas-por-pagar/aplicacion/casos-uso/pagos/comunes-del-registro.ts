import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { etiquetaDe } from '../../../dominio/documento-por-pagar.js';
import {
  exigirDiferenciasValidas,
  exigirLineasValidas,
  fechaMinimaDelPago,
  type DiferenciaPedida,
  type LineaPedida,
  type RestanteDelCargo,
} from '../../../dominio/registro-de-pago.js';
import type { TopeDeDiferenciaDelPago } from '../../puertos/puertos-de-pagos.js';
import type { LineaRevisada } from './dependencias-de-pagos.js';
import type { PeticionGuardable } from './peticion-de-pago.js';

/** Lo que el pago entrega a cada cargo y las diferencias de centavos que se saldan, ya en centavos. */
export interface PedidoEnCentavos {
  lineas: LineaPedida[];
  diferencias: DiferenciaPedida[];
}

/**
 * Pasa el dinero de texto a centavos y revisa las líneas.
 * @throws PagoSinDocumentos, DemasiadosDocumentosEnPago, MontoDePagoInvalido, CargoRepetido
 */
export function pedidoEnCentavos(pedido: PeticionGuardable): PedidoEnCentavos {
  const enCentavos = ({ cargoId, monto }: { cargoId: string; monto: string }) => ({
    cargoId,
    montoCentavos: aCentavos(monto),
  });
  const lineas = pedido.aplicaciones.map(enCentavos);
  exigirLineasValidas(lineas);
  return { lineas, diferencias: (pedido.diferencias ?? []).map(enCentavos) };
}

export const sumaDe = (lineas: readonly LineaRevisada[]): number =>
  lineas.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0);

/** La fecha más reciente que el pago no puede preceder: la emisión de sus documentos y, con un saldo inicial, la fecha de inicio. */
export function fechaMinimaDeLasLineas(lineas: readonly LineaRevisada[], fechaDeInicio: string | null): string {
  const hayInicial = lineas.some(({ fila }) => fila.documento.origen === 'saldo_inicial');
  const emisiones = lineas.map(({ fila }) => fila.documento.fechaEmision);
  return fechaMinimaDelPago({ emisiones, fechaDeInicio: hayInicial ? fechaDeInicio : null });
}

/**
 * Cada diferencia es de un cargo del pago y cabe en lo que queda del cargo y en el tope de la empresa.
 * @throws DiferenciaFueraDelPago, MontoDePagoInvalido, DiferenciaDePagoSobreElTope, DiferenciaMayorQueElSaldo
 */
export async function exigirDiferenciasDelPago(
  tope: TopeDeDiferenciaDelPago,
  operador: Operador,
  { lineas, diferencias }: { lineas: readonly LineaRevisada[]; diferencias: readonly DiferenciaPedida[] },
): Promise<void> {
  if (diferencias.length === 0) return;
  const restantes = new Map<string, RestanteDelCargo>(
    lineas.map(({ fila, saldoCentavos, montoCentavos }) => [
      fila.documento.id,
      { etiqueta: etiquetaDe(fila.documento), restanteCentavos: saldoCentavos - montoCentavos },
    ]),
  );
  exigirDiferenciasValidas(diferencias, restantes, await tope.centavos(operador));
}
