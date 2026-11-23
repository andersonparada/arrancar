import { z } from 'zod';
import {
  fechaObligatoria,
  fechaOpcional,
  idObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { renglones } from './movimientos.esquemas-http.js';

export const esquemaTraslado = z.object({
  fecha: fechaObligatoria(),
  bodegaDeOrigenId: idObligatorio(),
  bodegaDeDestinoId: idObligatorio(),
  entregadoA: textoOpcional(150),
  observaciones: textoOpcional(500),
  renglones,
});

/** Sin fecha, la recepción es de hoy. */
export const esquemaRecepcionDeTraslado = z.object({
  fecha: fechaOpcional(),
  observaciones: textoOpcional(500),
});

export type TrasladoSolicitado = z.infer<typeof esquemaTraslado>;
export type RecepcionDeTrasladoSolicitada = z.infer<typeof esquemaRecepcionDeTraslado>;
