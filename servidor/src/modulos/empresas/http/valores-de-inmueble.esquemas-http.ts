import { z } from 'zod';
import {
  decimalObligatorio,
  decimalOpcional,
  fechaObligatoria,
  opcionObligatoria,
  opcionOpcional,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { CATEGORIAS_DE_IUSI, FUENTES_DE_VALOR, ORIGENES_DE_VALOR } from '../dominio/tipos-de-valor-de-inmueble.js';

/** Forma de lo que llega al registrar un valor; las reglas de negocio las revisa el dominio. */
export const esquemaValorDeInmueble = z.object({
  fuente: opcionObligatoria(FUENTES_DE_VALOR),
  vigenteDesde: fechaObligatoria(),
  origen: opcionObligatoria(ORIGENES_DE_VALOR),
  valorTerreno: decimalOpcional(2),
  valorConstrucciones: decimalOpcional(2),
  valorCultivosPermanentes: decimalOpcional(2),
  valorTotal: decimalObligatorio(2),
  categoriaIusi: opcionOpcional(CATEGORIAS_DE_IUSI),
  documento: textoOpcional(150),
});

export const esquemaParamsValorDeInmueble = z.object({ inmuebleId: z.uuid(), valorId: z.uuid() });
export const esquemaParamsDeValoresDeInmueble = z.object({ inmuebleId: z.uuid() });

export type ValorDeInmuebleSolicitado = z.infer<typeof esquemaValorDeInmueble>;
export type ParamsValorDeInmueble = z.infer<typeof esquemaParamsValorDeInmueble>;
export type ParamsDeValoresDeInmueble = z.infer<typeof esquemaParamsDeValoresDeInmueble>;
