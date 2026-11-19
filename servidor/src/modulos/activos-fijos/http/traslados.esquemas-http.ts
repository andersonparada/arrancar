import { z } from 'zod';
import {
  enteroObligatorio,
  fechaObligatoria,
  idObligatorio,
  idOpcional,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';

/** Cuántos activos caben en una boleta: el cuerpo no debe crecer sin límite. */
const RENGLONES_MAXIMOS = 200;

const esquemaRenglonDeTraslado = z.object({
  activoId: idObligatorio(),
  cantidad: enteroObligatorio().min(1).optional(),
});

/** Forma de lo que llega al trasladar; las reglas de negocio las revisa el dominio y el caso de uso. */
export const esquemaTraslado = z.object({
  fecha: fechaObligatoria(),
  localidadId: idOpcional(),
  departamentoId: idOpcional(),
  responsable: textoOpcional(150),
  recibidoPor: textoObligatorio(150),
  motivo: textoObligatorio(300),
  aBodega: z.boolean().default(false),
  marcarOcioso: z.boolean().default(false),
  renglones: z.array(esquemaRenglonDeTraslado).min(1).max(RENGLONES_MAXIMOS),
});

export const esquemaAnulacionDeTraslado = z.object({ motivo: textoObligatorio(300) });

export const esquemaParamsBoleta = z.object({ grupoId: z.uuid() });

export type TrasladoSolicitado = z.infer<typeof esquemaTraslado>;
export type AnulacionDeTrasladoSolicitada = z.infer<typeof esquemaAnulacionDeTraslado>;
export type ParamsBoleta = z.infer<typeof esquemaParamsBoleta>;
