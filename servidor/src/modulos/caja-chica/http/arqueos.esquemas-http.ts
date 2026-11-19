import { z } from 'zod';
import { aCentavos } from '../../core/compartido/dominio/centavos.js';
import { DENOMINACIONES_EN_CENTAVOS } from '../dominio/conteo-de-efectivo.js';
import { textoOpcional } from './texto-opcional.js';

const DINERO = /^\d{1,12}(\.\d{1,2})?$/;
const MAXIMO_DE_LINEAS = DENOMINACIONES_EN_CENTAVOS.length;

const motivo = z.string().trim().min(1, 'Escriba el motivo.').max(300, 'El motivo admite hasta 300 caracteres.');

/** Una línea del conteo: la denominación en centavos y cuántas hay; el dominio revisa que la denominación exista. */
const lineaDeConteo = z.object({
  denominacionCentavos: z.number().int('La denominación va en centavos enteros.').positive(),
  cantidad: z.number().int('Cuente unidades enteras.').min(0, 'La cantidad no puede ser negativa.'),
});

/** Registrar un arqueo: lo contado por denominación, los cheques por cambiar y lo que explica una diferencia. */
export const esquemaArqueo = z.object({
  realizadoEn: z.iso.datetime({ offset: true, error: 'Escriba la fecha y hora con su zona.' }).optional(),
  conteo: z.array(lineaDeConteo).max(MAXIMO_DE_LINEAS, 'Hay más líneas que denominaciones.'),
  valoresPorCambiar: z
    .string()
    .trim()
    .regex(DINERO, 'Escriba el monto con hasta dos decimales.')
    .transform(aCentavos)
    .optional(),
  comprobantesCompletos: z.boolean(),
  observaciones: textoOpcional(500, 'Las observaciones admiten hasta 500 caracteres.'),
  motivoDeDiferencia: textoOpcional(300, 'El motivo admite hasta 300 caracteres.'),
  destinoDelFaltante: z.enum(['perdida', 'cobrar_al_custodio']).nullable().optional(),
});

export const esquemaAnularArqueo = z.object({ motivo });

export const esquemaParamsDeArqueo = z.object({ id: z.uuid() });

export type ArqueoSolicitado = z.infer<typeof esquemaArqueo>;
export type AnularArqueoSolicitado = z.infer<typeof esquemaAnularArqueo>;
export type ParamsDeArqueo = z.infer<typeof esquemaParamsDeArqueo>;
