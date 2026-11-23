import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { sumarMeses } from '../../../dominio/periodo-del-libro.js';
import type { FotoDelPeriodo } from '../../../dominio/periodos/foto-del-periodo.js';
import type { FormularioConRemanente } from '../../../dominio/periodos/remanentes-de-retenciones.js';
import type { RepositorioDePeriodos } from '../../puertos/puertos-de-periodos.js';

export interface PedidoDeRemanenteAnterior {
  /** `AAAA-MM-01`. */
  periodo: string;
  formulario: FormularioConRemanente;
  /** Lo que el usuario escribió al declarar, en centavos; solo vale si el mes previo no tiene foto con remanente. */
  escritoCentavos?: number | undefined;
}

/** La foto de la última declaración o rectificación del período (las reaperturas no llevan foto), si la hay. */
async function ultimaFotoDe(periodos: RepositorioDePeriodos, periodo: string): Promise<FotoDelPeriodo | null> {
  const historial = await periodos.historial(periodo);
  return historial.filter((declaracion) => declaracion.evento !== 'reapertura').at(-1)?.foto ?? null;
}

/**
 * El remanente de retenciones con que empieza el período, en centavos: el que dejó la foto del mes previo (del mismo
 * formulario); si no hay, lo que escribió el usuario; si tampoco, lo que ya traía la última declaración del mismo período
 * (una rectificación no lo pierde); y si nada, cero.
 */
export async function remanenteAnteriorDelPeriodo(
  periodos: RepositorioDePeriodos,
  pedido: PedidoDeRemanenteAnterior,
): Promise<number> {
  const previo = (await ultimaFotoDe(periodos, sumarMeses(pedido.periodo, -1)))?.remanentes;
  if (previo?.formulario === pedido.formulario) return aCentavos(previo.remanenteAlSiguiente);
  if (pedido.escritoCentavos !== undefined) return pedido.escritoCentavos;
  const propio = (await ultimaFotoDe(periodos, pedido.periodo))?.remanentes;
  return propio?.formulario === pedido.formulario ? aCentavos(propio.remanenteAnterior) : 0;
}
