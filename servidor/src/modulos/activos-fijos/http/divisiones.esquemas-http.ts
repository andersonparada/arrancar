import { z } from 'zod';
import {
  enteroObligatorio,
  fechaObligatoria,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { MAXIMO_DE_UNIDADES } from '../dominio/tipos-de-costo.js';

/** Dividir a mano: cuántas piezas se separan, desde qué fecha, por qué y, si se quiere, con qué código. */
export const esquemaDivision = z.object({
  cantidad: enteroObligatorio().min(1),
  fecha: fechaObligatoria(),
  motivo: textoObligatorio(300),
  codigo: textoOpcional(30),
});

/** Separar en unidades: la fecha, el motivo y, opcionalmente, los códigos de los activos nuevos en orden. */
export const esquemaSepararEnUnidades = z.object({
  fecha: fechaObligatoria(),
  motivo: textoObligatorio(300),
  codigos: z.array(z.string().trim().max(30)).max(MAXIMO_DE_UNIDADES).default([]),
});

export const esquemaAnulacionDeDivision = z.object({ motivo: textoObligatorio(300) });

export const esquemaParamsDivision = z.object({ divisionId: z.uuid() });

export type DivisionSolicitada = z.infer<typeof esquemaDivision>;
export type SeparacionSolicitada = z.infer<typeof esquemaSepararEnUnidades>;
export type AnulacionDeDivisionSolicitada = z.infer<typeof esquemaAnulacionDeDivision>;
export type ParamsDivision = z.infer<typeof esquemaParamsDivision>;
