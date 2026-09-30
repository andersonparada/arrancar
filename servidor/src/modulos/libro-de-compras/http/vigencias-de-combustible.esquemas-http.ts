import { z } from 'zod';
import {
  decimalObligatorio,
  fechaObligatoria,
  fechaOpcional,
  idObligatorio,
} from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o cambiar una vigencia de combustible; las reglas de negocio las revisa el dominio. */
export const esquemaVigenciaDeCombustible = z.object({
  combustibleId: idObligatorio(),
  idpPorGalon: decimalObligatorio(2),
  porcentajeDeEtanol: decimalObligatorio(2),
  vigenteDesde: fechaObligatoria(),
  vigenteHasta: fechaOpcional(),
});

export const esquemaParamsVigenciaDeCombustible = z.object({ vigenciaDeCombustibleId: z.uuid() });

export type VigenciaDeCombustibleSolicitado = z.infer<typeof esquemaVigenciaDeCombustible>;
export type ParamsVigenciaDeCombustible = z.infer<typeof esquemaParamsVigenciaDeCombustible>;
