import { z } from 'zod';

const DINERO = /^\d{1,12}(\.\d{1,2})?$/;
const LIMITE_POR_OMISION = 50;
const LIMITE_MAXIMO = 200;

const monto = z.string().trim().regex(DINERO, 'Escriba el monto con hasta dos decimales.');
const fecha = z.iso.date({ error: 'Escriba la fecha como AAAA-MM-DD.' });

/** Texto opcional con tope: sin espacios a los lados y el vacío es nulo (la base no admite textos vacíos). */
const textoOpcional = (maximo: number, aviso: string) =>
  z
    .string()
    .trim()
    .max(maximo, aviso)
    .transform((valor) => (valor === '' ? null : valor))
    .nullable()
    .optional();

/** Lo común a las dos formas; las demás reglas son del dominio y responden por campo. */
const comun = {
  beneficiarioId: z.uuid({ error: 'Escoja el beneficiario.' }),
  esEmpleado: z.boolean({ error: 'Diga si el beneficiario es empleado.' }),
  beneficiarioUsuarioId: z.uuid({ error: 'Escoja el usuario.' }).nullable().optional(),
  clase: z.enum(['viatico', 'compra', 'otro'], { error: 'Escoja la clase de anticipo.' }),
  descripcion: z.string().trim().min(1, 'Escriba para qué es el anticipo.').max(300, 'Admite hasta 300 caracteres.'),
  localidadId: z.uuid({ error: 'Escoja la localidad.' }).nullable().optional(),
  monto,
  fecha: fecha.optional(),
  fechaLimite: fecha.optional(),
  motivoConVencidos: textoOpcional(300, 'El motivo admite hasta 300 caracteres.'),
};

/** Un anticipo con cheque (a nombre del beneficiario, no negociable por omisión) o con nota de débito (transferencia). */
export const esquemaAnticipo = z.discriminatedUnion('forma', [
  z.object({
    forma: z.literal('cheque'),
    chequeraId: z.uuid({ error: 'Escoja la chequera.' }),
    chequeId: z.uuid().optional(),
    noNegociable: z.boolean().optional(),
    ...comun,
  }),
  z.object({
    forma: z.literal('nota_de_debito'),
    cuentaBancariaId: z.uuid({ error: 'Escoja la cuenta bancaria.' }),
    referencia: textoOpcional(100, 'La referencia admite hasta 100 caracteres.'),
    ...comun,
  }),
]);

export const esquemaParamsDeAnticipo = z.object({ id: z.uuid() });

const comoBooleano = z.enum(['true', 'false']).transform((valor) => valor === 'true');

/** La lista: por omisión los anticipos abiertos; con `corte`, los que estaban por liquidar a esa fecha. */
export const esquemaListaDeAnticipos = z.object({
  estado: z.enum(['abierto', 'liquidado', 'anulado', 'todos']).default('abierto'),
  corte: fecha.optional(),
  beneficiarioId: z.uuid().optional(),
  vencidos: comoBooleano.default(false),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_OMISION),
});

const motivo = z.string().trim().min(1, 'Escriba el motivo.').max(300, 'El motivo admite hasta 300 caracteres.');

/** Anular: el motivo y, si mueve dinero en Bancos, la fecha del inverso (por omisión la decide Bancos). */
export const esquemaAnularAnticipo = z.object({ motivo, fecha: fecha.optional() });

export type AnticipoSolicitado = z.infer<typeof esquemaAnticipo>;
export type ParamsDeAnticipo = z.infer<typeof esquemaParamsDeAnticipo>;
export type ListaDeAnticiposSolicitada = z.output<typeof esquemaListaDeAnticipos>;
export type AnularAnticipoSolicitado = z.infer<typeof esquemaAnularAnticipo>;
