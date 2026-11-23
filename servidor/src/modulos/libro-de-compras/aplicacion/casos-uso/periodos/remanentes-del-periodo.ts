import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { sumarMeses } from '../../../dominio/periodo-del-libro.js';
import type { FotoDelPeriodo } from '../../../dominio/periodos/foto-del-periodo.js';
import type { FormularioConRemanente, SaldosAnteriores } from '../../../dominio/periodos/remanentes-de-retenciones.js';
import type { RepositorioDePeriodos } from '../../puertos/puertos-de-periodos.js';

export interface PedidoDeRemanenteAnterior {
  /** `AAAA-MM-01`. */
  periodo: string;
  formulario: FormularioConRemanente;
  /** Lo que el usuario escribió al declarar; solo vale si el mes previo no tiene foto con remanente. */
  escrito?: SaldosAnteriores | undefined;
}

/** La foto de la última declaración o rectificación del período (las reaperturas no llevan foto), si la hay. */
async function ultimaFotoDe(periodos: RepositorioDePeriodos, periodo: string): Promise<FotoDelPeriodo | null> {
  const historial = await periodos.historial(periodo);
  return historial.filter((declaracion) => declaracion.evento !== 'reapertura').at(-1)?.foto ?? null;
}

/** Con lo que empezó la foto: el remanente que calculó o, sin ventas, los saldos iniciales que guardó. */
export function saldosDeInicioDeLaFoto(foto: FotoDelPeriodo | null, formulario: FormularioConRemanente) {
  const calculado = foto?.remanentes;
  if (calculado?.formulario === formulario) {
    return {
      retencionesCentavos: aCentavos(calculado.remanenteAnterior),
      creditoCentavos: aCentavos(calculado.creditoAnterior ?? '0.00'),
    };
  }
  const guardado = foto?.saldosIniciales;
  if (guardado?.formulario !== formulario) return null;
  return { retencionesCentavos: aCentavos(guardado.retenciones), creditoCentavos: aCentavos(guardado.credito) };
}

/**
 * Los saldos con que empieza el período: lo que dejó la foto del mes previo (del mismo formulario); si no hay, lo que
 * escribió el usuario; si tampoco, con lo que ya empezó la última declaración del mismo período (una rectificación no
 * lo pierde); y si nada, cero.
 */
export async function remanenteAnteriorDelPeriodo(
  periodos: RepositorioDePeriodos,
  pedido: PedidoDeRemanenteAnterior,
): Promise<SaldosAnteriores> {
  const previo = (await ultimaFotoDe(periodos, sumarMeses(pedido.periodo, -1)))?.remanentes;
  if (previo?.formulario === pedido.formulario) {
    return {
      retencionesCentavos: aCentavos(previo.remanenteAlSiguiente),
      creditoCentavos: aCentavos(previo.creditoAlSiguiente ?? '0.00'),
    };
  }
  if (pedido.escrito) return pedido.escrito;
  const propia = await ultimaFotoDe(periodos, pedido.periodo);
  return saldosDeInicioDeLaFoto(propia, pedido.formulario) ?? { retencionesCentavos: 0, creditoCentavos: 0 };
}
