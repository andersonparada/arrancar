import { z } from 'zod';
import {
  decimalObligatorio,
  enteroOpcional,
  opcionObligatoria,
  textoObligatorio,
} from '../../core/compartido/http/esquemas-comunes.js';
import { INCISOS_FISCALES } from '../dominio/incisos-fiscales.js';

/** Forma de lo que llega al registrar o cambiar una clase de activo; las reglas de negocio las revisa el dominio. */
export const esquemaClase = z.object({
  nombre: textoObligatorio(80),
  incisoFiscal: opcionObligatoria(INCISOS_FISCALES),
  porcentajeFiscal: decimalObligatorio(2),
  vidaUtilContableMeses: enteroOpcional(),
  valorResidualPorcentaje: decimalObligatorio(2),
  activo: z.boolean().default(true),
});

export const esquemaParamsClase = z.object({ claseId: z.uuid() });

/** Los conceptos de gasto del libro de compras que proponen la clase; la lista reemplaza a la anterior. */
export const esquemaConceptosDeClase = z.object({ conceptoIds: z.array(z.uuid()).max(500) });

export type ClaseSolicitado = z.infer<typeof esquemaClase>;
export type ConceptosDeClaseSolicitados = z.infer<typeof esquemaConceptosDeClase>;
export type ParamsClase = z.infer<typeof esquemaParamsClase>;
