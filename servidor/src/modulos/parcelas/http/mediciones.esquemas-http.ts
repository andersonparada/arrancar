import { z } from 'zod';
import {
  decimalObligatorio,
  decimalOpcional,
  enteroOpcional,
  fechaObligatoria,
  opcionObligatoria,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { FUENTES_DE_MEDICION } from '../dominio/medicion.js';
import { UNIDADES_DE_SUPERFICIE } from '../dominio/superficie.js';

/** Forma de lo que llega al registrar una medición; las reglas (cuerdas, útil menor que total) las revisa el dominio. */
export const esquemaMedicion = z.object({
  vigenteDesde: fechaObligatoria(),
  fuente: opcionObligatoria(FUENTES_DE_MEDICION),
  cantidadOriginal: decimalObligatorio(4),
  unidadOriginal: opcionObligatoria(UNIDADES_DE_SUPERFICIE),
  varasPorLadoDeCuerda: enteroOpcional(),
  cantidadUtil: decimalOpcional(4),
  documento: textoOpcional(150),
});

export const esquemaAnulacionDeMedicion = z.object({ motivo: textoObligatorio(300) });

export const esquemaParamsDeParcelaMedicion = z.object({ parcelaId: z.uuid() });
export const esquemaParamsMedicion = z.object({ medicionId: z.uuid() });

export type MedicionSolicitada = z.infer<typeof esquemaMedicion>;
export type AnulacionDeMedicionSolicitada = z.infer<typeof esquemaAnulacionDeMedicion>;
export type ParamsDeParcelaMedicion = z.infer<typeof esquemaParamsDeParcelaMedicion>;
export type ParamsMedicion = z.infer<typeof esquemaParamsMedicion>;
