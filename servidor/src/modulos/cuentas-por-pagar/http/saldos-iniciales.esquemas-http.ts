import { z } from 'zod';
import { TIPOS_DE_DOCUMENTO } from '../dominio/tipos-de-documento.js';

const LIMITE_POR_OMISION = 50;
const LIMITE_MAXIMO = 200;
const DINERO = /^\d{1,12}(\.\d{1,2})?$/;

const dinero = (campo: string) => z.string().trim().regex(DINERO, `Escriba ${campo} con hasta dos decimales.`);
const fecha = (campo: string) => z.iso.date({ error: `Escriba ${campo} como AAAA-MM-DD.` });

export const esquemaParamsDeSaldoInicial = z.object({ saldoInicialId: z.uuid() });

/**
 * Lo que se pide para cargar o corregir un saldo inicial (la misma solicitud sirve al formulario y al Excel). Aquí solo
 * se revisa la forma; las reglas de los montos y las fechas son del dominio y responden por campo.
 */
export const esquemaSaldoInicial = z.object({
  proveedorId: z.uuid({ error: 'Escoja el proveedor.' }),
  tipo: z.enum(TIPOS_DE_DOCUMENTO, { error: 'Escoja el tipo de documento.' }),
  serie: z.string().nullable().default(null),
  numero: z.string({ error: 'Escriba el número del documento.' }),
  fechaEmision: fecha('la fecha de emisión'),
  vencimiento: fecha('el vencimiento').nullable().default(null),
  total: dinero('el total'),
  retenciones: dinero('las retenciones').default('0.00'),
  retencionesPorPracticar: dinero('las retenciones por practicar').default('0.00'),
  saldoPendiente: dinero('el saldo pendiente'),
  referencia: z.string().nullable().default(null),
  tieneActivoFijo: z.boolean().default(false),
});

/** El motivo se valida en el caso de uso (de 1 a 300 caracteres, sin espacios sobrantes). */
export const esquemaEliminarSaldoInicial = z.object({ motivo: z.string() });

export const esquemaFiltroDeSaldosIniciales = z.object({
  proveedorId: z.uuid().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_OMISION),
});

export type ParamsDeSaldoInicial = z.infer<typeof esquemaParamsDeSaldoInicial>;
export type SaldoInicialSolicitado = z.output<typeof esquemaSaldoInicial>;
export type EliminarSaldoInicialSolicitado = z.infer<typeof esquemaEliminarSaldoInicial>;
export type FiltroDeSaldosInicialesSolicitado = z.output<typeof esquemaFiltroDeSaldosIniciales>;
