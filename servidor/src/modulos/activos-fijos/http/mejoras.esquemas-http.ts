import { z } from 'zod';
import {
  decimalObligatorio,
  decimalOpcional,
  enteroObligatorio,
  fechaObligatoria,
  idObligatorio,
  opcionObligatoria,
  opcionOpcional,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { CLASES_DE_MEJORA } from '../dominio/mejora.js';
import { CLASES_DE_COSTO_ELEGIBLES } from '../dominio/tipos-de-costo.js';

/** Cuántos renglones caben en una mejora: el cuerpo no debe crecer sin límite. */
const RENGLONES_MAXIMOS = 100;

/** Una parte de una línea del libro: con dos decimales, negativa si la línea es de una nota de crédito. */
const esquemaLineaDeMejora = z.object({
  lineaId: idObligatorio(),
  monto: decimalObligatorio(2),
  claseDeCosto: opcionOpcional(CLASES_DE_COSTO_ELEGIBLES),
});

/** Un costo escrito a mano de la mejora; su fecha y su marca de edificación son las de la mejora. */
const esquemaCostoManualDeMejora = z.object({
  claseDeCosto: opcionObligatoria(CLASES_DE_COSTO_ELEGIBLES),
  monto: decimalObligatorio(2),
  documentoDeSoporte: textoObligatorio(150),
  descripcion: textoOpcional(300),
  aplicaAlLibroFiscal: z.boolean().default(true),
  motivoFueraDelLibroFiscal: textoOpcional(300),
});

export const esquemaMejora = z.object({
  activoId: idObligatorio(),
  clase: opcionObligatoria(CLASES_DE_MEJORA),
  fecha: fechaObligatoria(),
  descripcion: textoObligatorio(300),
  vidaUtilRestanteContableMeses: enteroObligatorio()
    .min(1)
    .max(1200)
    .nullish()
    .transform((valor) => valor ?? null),
  noEsEdificacion: z.boolean().default(false),
  lineas: z.array(esquemaLineaDeMejora).max(RENGLONES_MAXIMOS).default([]),
  costosManuales: z.array(esquemaCostoManualDeMejora).max(RENGLONES_MAXIMOS).default([]),
});

export const esquemaAnulacionDeMejora = z.object({ motivo: textoObligatorio(300) });

export const esquemaParamsMejora = z.object({ mejoraId: z.uuid() });

export const esquemaRevisionDeEstimacion = z.object({
  vidaUtilRestanteMeses: enteroObligatorio().min(1).max(1200),
  valorResidual: decimalOpcional(2),
  porcentajeFiscal: decimalOpcional(2),
  motivo: textoObligatorio(300),
});

export const esquemaValorFiscalDelInmueble = z.object({
  valorDeMatricula: decimalOpcional(2),
  valorCatastral: decimalOpcional(2),
  valoresDelInmuebleCompleto: z.boolean().default(false),
  motivo: textoObligatorio(300),
  documentoDeSoporte: textoObligatorio(150),
});

export type MejoraSolicitada = z.infer<typeof esquemaMejora>;
export type AnulacionDeMejoraSolicitada = z.infer<typeof esquemaAnulacionDeMejora>;
export type ParamsMejora = z.infer<typeof esquemaParamsMejora>;
export type RevisionDeEstimacionSolicitada = z.infer<typeof esquemaRevisionDeEstimacion>;
export type ValorFiscalDelInmuebleSolicitado = z.infer<typeof esquemaValorFiscalDelInmueble>;
