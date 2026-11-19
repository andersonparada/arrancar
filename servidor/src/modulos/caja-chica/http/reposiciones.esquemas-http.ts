import { z } from 'zod';
import { textoOpcional } from './texto-opcional.js';

const MAXIMO_DE_COMPROBANTES = 500;

const fecha = z.iso.date({ error: 'Escriba la fecha como AAAA-MM-DD.' });
const motivo = z.string().trim().min(1, 'Escriba el motivo.').max(300, 'El motivo admite hasta 300 caracteres.');

/** Lo común a las dos formas de reponer. */
const comun = {
  comprobanteIds: z
    .array(z.uuid())
    .min(1, 'Escoja al menos un comprobante.')
    .max(MAXIMO_DE_COMPROBANTES, `Se reponen hasta ${MAXIMO_DE_COMPROBANTES} comprobantes a la vez.`),
  fecha: fecha.optional(),
  observaciones: textoOpcional(500, 'Las observaciones admiten hasta 500 caracteres.'),
};

const enCheque = {
  forma: z.literal('cheque'),
  chequeraId: z.uuid({ error: 'Escoja la chequera.' }),
  chequeId: z.uuid().optional(),
  noNegociable: z.boolean().optional(),
  /** El vacío no es nulo: el dominio lo rechaza como cheque al portador. */
  beneficiario: z.string().trim().max(150, 'El beneficiario admite hasta 150 caracteres.').nullable().optional(),
};

const enNota = {
  forma: z.literal('nota_de_debito'),
  cuentaBancariaId: z.uuid({ error: 'Escoja la cuenta bancaria.' }),
  referencia: textoOpcional(100, 'La referencia admite hasta 100 caracteres.'),
};

/** Reponer: los comprobantes pendientes y un cheque de la chequera o una nota de débito. */
export const esquemaReposicion = z.discriminatedUnion('forma', [
  z.object({ ...enCheque, ...comun }),
  z.object({ ...enNota, ...comun }),
]);

/** Anular: el motivo y, si Bancos hace un inverso, su fecha (por omisión la decide Bancos). */
export const esquemaAnularReposicion = z.object({ motivo, fecha: fecha.optional() });

export const esquemaParamsDeReposicion = z.object({ id: z.uuid() });

export type ReposicionSolicitada = z.infer<typeof esquemaReposicion>;
export type AnularReposicionSolicitada = z.infer<typeof esquemaAnularReposicion>;
export type ParamsDeReposicion = z.infer<typeof esquemaParamsDeReposicion>;
