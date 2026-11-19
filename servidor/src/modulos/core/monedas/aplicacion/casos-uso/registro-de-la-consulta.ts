import type { PublicacionDeTipoDeCambio, PublicacionRechazada } from '../../dominio/publicacion.js';
import type { ConsultaHecha, ResultadoDeLaConsulta } from '../puertos/cargas-de-tipos.js';
import type { PedidoAlBanguat } from './consultar-al-banguat.js';

const LARGO_DEL_DETALLE = 500;

/** Lo que dejó una llamada: el resultado de la bitácora, lo rechazado y lo que se guarda. */
export interface Hallazgo {
  resultado: ResultadoDeLaConsulta;
  detalle: string | null;
  rechazadas?: readonly PublicacionRechazada[];
  publicaciones?: readonly PublicacionDeTipoDeCambio[];
}

/** El resultado de la bitácora: si nada se guardó y algo se rechazó, el motivo del primer rechazo. */
export function resultadoDe(
  recibidas: number,
  guardadas: number,
  rechazadas: readonly PublicacionRechazada[],
): ResultadoDeLaConsulta {
  const primera = rechazadas[0];
  if (guardadas === 0 && primera) return primera.motivo === 'dato_invalido' ? 'error' : primera.motivo;
  return recibidas === 0 && !primera ? 'sin_datos' : 'exito';
}

const SALIDA_DE_LA_VARIACION = 'Si la variación es real (una devaluación), ingrese el tipo a mano con su motivo.';

export function detalleDe(rechazadas: readonly PublicacionRechazada[], avisos: readonly string[]): string | null {
  const lineas = [...rechazadas.map((r) => `${r.moneda} ${r.fecha}: ${r.motivo}`), ...avisos];
  if (rechazadas.some((r) => r.motivo === 'variacion_excesiva')) lineas.push(SALIDA_DE_LA_VARIACION);
  return lineas.length > 0 ? lineas.join(' | ') : null;
}

/** La fila de la bitácora: `TipoCambioDia` puede traer varias monedas, así que no lleva moneda ni código. */
export function consultaDe(
  pedido: PedidoAlBanguat,
  horas: { iniciadaEn: Date; terminadaEn: Date },
  hallazgo: Hallazgo,
): ConsultaHecha {
  const delDia = pedido.operacion === 'TipoCambioDia';
  return {
    ...horas,
    operacion: pedido.operacion,
    vuelta: pedido.vuelta,
    moneda: delDia ? null : pedido.moneda.moneda,
    codigoBanguat: delDia ? null : pedido.moneda.codigoBanguat,
    desde: pedido.desde,
    hasta: pedido.hasta,
    resultado: hallazgo.resultado,
    filasRechazadas: hallazgo.rechazadas?.length ?? 0,
    detalle: hallazgo.detalle?.slice(0, LARGO_DEL_DETALLE) ?? null,
    disparadaPor: pedido.disparadaPor ?? null,
  };
}
