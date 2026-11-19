import { z } from 'zod';
import { textoOpcional } from './texto-opcional.js';

const DINERO = /^\d{1,12}(\.\d{1,2})?$/;
const LIMITE_POR_OMISION = 50;
const LIMITE_MAXIMO = 200;

const monto = z.string().trim().regex(DINERO, 'Escriba el monto con hasta dos decimales.');
const fecha = z.iso.date({ error: 'Escriba la fecha como AAAA-MM-DD.' });
const motivo = z.string().trim().min(1, 'Escriba el motivo.').max(300, 'El motivo admite hasta 300 caracteres.');

/** Lo común a las dos formas de entregar el dinero al fondo. */
const entrega = {
  fecha: fecha.optional(),
  monto,
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

/** Aumentar: un cheque de la chequera o una nota de débito. */
export const esquemaAumento = z.discriminatedUnion('forma', [
  z.object({ ...enCheque, ...entrega }),
  z.object({ ...enNota, ...entrega }),
]);

/** Los datos del fondo; que haya custodio (texto o usuario) y las demás reglas son del dominio y responden por campo. */
const datosDelFondo = {
  nombre: z.string().trim().min(1, 'Escriba el nombre del fondo.').max(80, 'El nombre admite hasta 80 caracteres.'),
  localidadId: z.uuid().nullable().optional(),
  custodio: textoOpcional(150, 'El custodio admite hasta 150 caracteres.'),
  custodioUsuarioId: z.uuid({ error: 'Escoja el usuario.' }).nullable().optional(),
  topePorComprobante: monto.nullable().optional(),
};

/** Abrir: los datos del fondo y el cheque o la nota de débito con que se entrega el dinero. */
export const esquemaApertura = z.discriminatedUnion('forma', [
  z.object({ ...enCheque, ...entrega, ...datosDelFondo }),
  z.object({ ...enNota, ...entrega, ...datosDelFondo }),
]);

/** Disminuir: el custodio deposita; por omisión, en la cuenta del fondo. */
export const esquemaDisminucion = z.object({
  fecha: fecha.optional(),
  monto,
  cuentaBancariaId: z.uuid().nullable().optional(),
  referencia: textoOpcional(100, 'La referencia admite hasta 100 caracteres.'),
  observaciones: textoOpcional(500, 'Las observaciones admiten hasta 500 caracteres.'),
});

/** Editar: lo que no viene no se toca; `null` limpia la localidad, el tope o la cuenta. */
export const esquemaEdicion = z.object({
  nombre: datosDelFondo.nombre.optional(),
  localidadId: datosDelFondo.localidadId,
  topePorComprobante: datosDelFondo.topePorComprobante,
  cuentaBancariaId: z.uuid().nullable().optional(),
  motivo: textoOpcional(300, 'El motivo admite hasta 300 caracteres.'),
});

export const esquemaCustodio = z.object({
  custodio: datosDelFondo.custodio,
  custodioUsuarioId: datosDelFondo.custodioUsuarioId,
  fecha: fecha.optional(),
  motivo,
});

/** Anular la apertura: el motivo y, si Bancos hace un inverso, su fecha (por omisión la decide Bancos). */
export const esquemaAnularApertura = z.object({ motivo, fecha: fecha.optional() });

/** Cerrar: el motivo, la fecha y, si queda efectivo, la cuenta del depósito (por omisión la del fondo) y su referencia. */
export const esquemaCierre = z.object({
  motivo,
  fecha: fecha.optional(),
  cuentaBancariaId: z.uuid().nullable().optional(),
  referencia: textoOpcional(100, 'La referencia admite hasta 100 caracteres.'),
});

export const esquemaParamsDeFondo = z.object({ id: z.uuid() });

/** La lista: por omisión los fondos abiertos. */
export const esquemaListaDeFondos = z.object({
  estado: z.enum(['abierto', 'cerrado', 'todos']).default('abierto'),
  localidadId: z.uuid().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_OMISION),
});

export type ParamsDeFondo = z.infer<typeof esquemaParamsDeFondo>;
export type ListaDeFondosSolicitada = z.output<typeof esquemaListaDeFondos>;
export type AperturaSolicitada = z.infer<typeof esquemaApertura>;
export type AumentoSolicitado = z.infer<typeof esquemaAumento>;
export type DisminucionSolicitada = z.infer<typeof esquemaDisminucion>;
export type EdicionSolicitada = z.infer<typeof esquemaEdicion>;
export type CustodioSolicitado = z.infer<typeof esquemaCustodio>;
export type AnularAperturaSolicitada = z.infer<typeof esquemaAnularApertura>;
export type CierreSolicitado = z.infer<typeof esquemaCierre>;
