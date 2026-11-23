import type { EstadoDeTraslado } from './documento.js';
import { DocumentoInvalido, TrasladoALaMismaBodega } from './errores-de-kardex.js';
import {
  SIN_DESTINO,
  exigirRenglones,
  textoOpcional,
  type PlanDeDocumento,
  type RenglonDePlan,
} from './plan-de-documento.js';

export interface TrasladoEscrito {
  fecha: string;
  bodegaDeOrigenId: string;
  bodegaDeDestinoId: string;
  /** Quien recibe lo que sale (firma de la boleta). */
  entregadoA: string | null;
  observaciones: string | null;
  renglones: readonly RenglonDePlan[];
  /** Con tránsito la salida queda `en_transito`; sin él, el traslado nace ya `recibido`. */
  conTransito: boolean;
}

/** Un traslado no lleva costo escrito: es neutro para el costeo y su costo unitario es solo informativo (§7.2). */
const sinCosto = (renglon: RenglonDePlan): RenglonDePlan => ({ ...renglon, costoTotal: 0n });

/**
 * Revisa y arma la salida de un traslado (§6.7): otra bodega de destino y al menos un renglón con cantidad. Las dos
 * mitades son movimientos `traslado`: no cambian el costo ni el valor del artículo.
 * @throws TrasladoALaMismaBodega si el destino es el origen.
 * @throws DocumentoInvalido si faltan renglones o alguna cantidad no es mayor que cero.
 */
export function planDeSalidaDeTraslado(datos: TrasladoEscrito): PlanDeDocumento {
  if (datos.bodegaDeOrigenId === datos.bodegaDeDestinoId) throw new TrasladoALaMismaBodega();
  exigirRenglones(datos.renglones);
  const estado: EstadoDeTraslado = datos.conTransito ? 'en_transito' : 'recibido';
  return {
    ...SIN_DESTINO,
    clase: 'salida_de_traslado',
    fecha: datos.fecha,
    bodegaId: datos.bodegaDeOrigenId,
    bodegaDeDestinoId: datos.bodegaDeDestinoId,
    estadoDeTraslado: estado,
    entregadoA: textoOpcional(datos.entregadoA, 'Entregado a', 150),
    observaciones: textoOpcional(datos.observaciones, 'Observaciones', 500),
    renglones: datos.renglones.map(sinCosto),
    avisos: [],
  };
}

export interface RecepcionDeTrasladoEscrita {
  /** La fecha de la salida del traslado: la entrada no puede ser anterior. */
  fechaDeLaSalida: string;
  fecha: string;
  bodegaDeDestinoId: string;
  documentoDeLaSalidaId: string;
  observaciones: string | null;
  /** Lo mismo que salió: no se recibe «menos» (lo que faltó va a un ajuste). */
  renglones: readonly RenglonDePlan[];
}

/**
 * La entrada de un traslado (§6.7): lo mismo que salió, en la bodega de destino y con fecha igual o posterior a la de
 * la salida. Una diferencia de cantidad se registra completa y lo que faltó va a un ajuste.
 * @throws DocumentoInvalido si la fecha es anterior a la de la salida.
 */
export function planDeEntradaDeTraslado(datos: RecepcionDeTrasladoEscrita): PlanDeDocumento {
  if (datos.fecha < datos.fechaDeLaSalida) {
    throw new DocumentoInvalido(
      `La recepción no puede ser anterior a la salida del traslado (${datos.fechaDeLaSalida}).`,
    );
  }
  return {
    ...SIN_DESTINO,
    clase: 'entrada_de_traslado',
    fecha: datos.fecha,
    bodegaId: datos.bodegaDeDestinoId,
    documentoRelacionadoId: datos.documentoDeLaSalidaId,
    entregadoA: null,
    observaciones: textoOpcional(datos.observaciones, 'Observaciones', 500),
    renglones: datos.renglones.map(sinCosto),
    avisos: [],
  };
}
