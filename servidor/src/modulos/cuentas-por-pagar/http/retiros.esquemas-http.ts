import { z } from 'zod';
import { textoOpcional } from './texto-opcional.js';

const DINERO = /^\d{1,12}(\.\d{1,2})?$/;
const LIMITE_POR_OMISION = 50;
const LIMITE_MAXIMO = 200;

const monto = z.string().trim().regex(DINERO, 'Escriba el monto con hasta dos decimales.');
const fecha = z.iso.date({ error: 'Escriba la fecha como AAAA-MM-DD.' });

/** Lo común a las dos formas; que haya custodio (texto o usuario) y las demás reglas son del dominio y responden por campo. */
const comun = {
  fecha: fecha.optional(),
  monto,
  custodio: textoOpcional(150, 'El custodio admite hasta 150 caracteres.'),
  custodioUsuarioId: z.uuid({ error: 'Escoja el usuario.' }).nullable().optional(),
  observaciones: textoOpcional(500, 'Las observaciones admiten hasta 500 caracteres.'),
};

/** Un retiro con cheque (a nombre del custodio u otro, no negociable por omisión) o con nota de débito (boleta o cajero). */
export const esquemaRetiro = z.discriminatedUnion('forma', [
  z.object({
    forma: z.literal('cheque'),
    chequeraId: z.uuid({ error: 'Escoja la chequera.' }),
    chequeId: z.uuid().optional(),
    noNegociable: z.boolean().optional(),
    paraAbonoEnCuenta: z.boolean().optional(),
    /** El vacío no es nulo: el dominio lo rechaza como cheque al portador. */
    beneficiario: z.string().trim().max(150, 'El beneficiario admite hasta 150 caracteres.').nullable().optional(),
    ...comun,
  }),
  z.object({
    forma: z.literal('nota_de_debito'),
    cuentaBancariaId: z.uuid({ error: 'Escoja la cuenta bancaria.' }),
    referencia: textoOpcional(100, 'La referencia admite hasta 100 caracteres.'),
    ...comun,
  }),
]);

export const esquemaParamsDeRetiro = z.object({ id: z.uuid() });

const comoBooleano = z.enum(['true', 'false']).transform((valor) => valor === 'true');

/** La lista: por omisión los retiros abiertos; con `corte`, los que estaban por liquidar a esa fecha. */
export const esquemaListaDeRetiros = z.object({
  estado: z.enum(['abierto', 'liquidado', 'anulado', 'todos']).default('abierto'),
  corte: fecha.optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  soloConDisponible: comoBooleano.default(false),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_OMISION),
});

const motivo = z.string().trim().min(1, 'Escriba el motivo.').max(300, 'El motivo admite hasta 300 caracteres.');

/** Liquidar: lo que se deposita de vuelta y lo que falta (con su motivo). */
export const esquemaLiquidarRetiro = z.object({
  fecha: fecha.optional(),
  devuelto: monto,
  cuentaBancariaId: z.uuid().optional(),
  referencia: textoOpcional(100, 'La referencia admite hasta 100 caracteres.'),
  faltante: monto,
  motivoDeFaltante: textoOpcional(300, 'El motivo admite hasta 300 caracteres.'),
});

/** Anular o reabrir: el motivo y, si mueve dinero en Bancos, la fecha del inverso (por omisión la decide Bancos). */
export const esquemaCambiarRetiro = z.object({ motivo, fecha: fecha.optional() });

export type RetiroSolicitado = z.infer<typeof esquemaRetiro>;
export type ParamsDeRetiro = z.infer<typeof esquemaParamsDeRetiro>;
export type ListaDeRetirosSolicitada = z.output<typeof esquemaListaDeRetiros>;
export type LiquidarRetiroSolicitado = z.infer<typeof esquemaLiquidarRetiro>;
export type CambiarRetiroSolicitado = z.infer<typeof esquemaCambiarRetiro>;
