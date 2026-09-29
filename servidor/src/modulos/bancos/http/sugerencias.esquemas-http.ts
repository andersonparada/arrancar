import { z } from 'zod';
import {
  decimalOpcional,
  fechaOpcional,
  idObligatorio,
  opcionObligatoria,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';

/** Los filtros de la bandeja «Sin clasificar»: una cuenta y entre dos fechas (`AAAA-MM-DD`, incluidas). */
export const esquemaFiltroDeSugerencias = z.object({
  cuentaBancariaId: z.uuid().optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
});

/** Lo que se sabe de un cheque mientras se captura: solo la cuenta es obligatoria (`POST` para no dejar el nombre en las URL). */
const camposDeCaptura = {
  cuentaBancariaId: idObligatorio(),
  fecha: fechaOpcional(),
  monto: decimalOpcional(2),
  beneficiario: textoOpcional(150),
  referencia: textoOpcional(150),
  observaciones: textoOpcional(2000),
};

export const esquemaSugerenciaDeCheque = z.object(camposDeCaptura);

/** En una nota la dirección importa: solo votan ejemplos de crédito o solo de débito. */
export const esquemaSugerenciaDeNota = z.object({ ...camposDeCaptura, tipo: opcionObligatoria(['credito', 'debito']) });

export type FiltroDeSugerenciasSolicitado = z.infer<typeof esquemaFiltroDeSugerencias>;
export type SugerenciaDeChequeSolicitada = z.infer<typeof esquemaSugerenciaDeCheque>;
export type SugerenciaDeNotaSolicitada = z.infer<typeof esquemaSugerenciaDeNota>;
