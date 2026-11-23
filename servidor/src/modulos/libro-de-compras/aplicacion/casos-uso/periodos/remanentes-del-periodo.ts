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
  escrito?: SaldosEscritos | undefined;
}

/** Lo que el usuario escribió: cada saldo que dejó vacío conserva el de la declaración anterior del período. */
export interface SaldosEscritos {
  retencionesCentavos?: number | undefined;
  creditoCentavos?: number | undefined;
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

/** Con lo que cerró la foto del mes previo: el remanente que calculó o, sin ventas, los saldos iniciales que trasladó. */
function saldosAlSiguienteDeLaFoto(foto: FotoDelPeriodo | null, formulario: FormularioConRemanente) {
  const calculado = foto?.remanentes;
  if (calculado?.formulario === formulario) {
    return {
      retencionesCentavos: aCentavos(calculado.remanenteAlSiguiente),
      creditoCentavos: aCentavos(calculado.creditoAlSiguiente ?? '0.00'),
    };
  }
  // Sin respuesta de ventas no hay débito conocido: los saldos iniciales pasan tal cual, sin sumarles el crédito del mes.
  return foto?.saldosIniciales?.formulario === formulario ? saldosDeInicioDeLaFoto(foto, formulario) : null;
}

/**
 * Los saldos con que empieza el período: lo que dejó la foto del mes previo (del mismo formulario); si no hay, lo que
 * escribió el usuario (cada saldo que dejó vacío conserva el con que ya empezó la última declaración del mismo período,
 * así una rectificación no lo pierde); y si nada, cero.
 */
export async function remanenteAnteriorDelPeriodo(
  periodos: RepositorioDePeriodos,
  pedido: PedidoDeRemanenteAnterior,
): Promise<SaldosAnteriores> {
  const previo = saldosAlSiguienteDeLaFoto(
    await ultimaFotoDe(periodos, sumarMeses(pedido.periodo, -1)),
    pedido.formulario,
  );
  if (previo) return previo;
  const propia = saldosDeInicioDeLaFoto(await ultimaFotoDe(periodos, pedido.periodo), pedido.formulario);
  return conLoEscrito(propia ?? { retencionesCentavos: 0, creditoCentavos: 0 }, pedido.escrito);
}

/** Lo escrito reemplaza solo el saldo que trae; el que se dejó vacío queda como estaba. */
function conLoEscrito(base: SaldosAnteriores, escrito: SaldosEscritos | undefined): SaldosAnteriores {
  return {
    retencionesCentavos: escrito?.retencionesCentavos ?? base.retencionesCentavos,
    creditoCentavos: escrito?.creditoCentavos ?? base.creditoCentavos,
  };
}
