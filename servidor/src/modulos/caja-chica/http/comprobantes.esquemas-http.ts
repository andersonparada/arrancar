import { z } from 'zod';
import { textoOpcional } from './texto-opcional.js';

const DINERO = /^\d{1,12}(\.\d{1,2})?$/;
const MAXIMO_DE_DOCUMENTOS = 100;

const fecha = z.iso.date({ error: 'Escriba la fecha como AAAA-MM-DD.' });
const texto = (maximo: number, vacio: string) =>
  z.string().trim().min(1, vacio).max(maximo, `Admite hasta ${maximo} caracteres.`);
const motivo = texto(300, 'Escriba el motivo.');

const documentoPorAsignar = z.object({
  comprobanteId: z.uuid(),
  fecha: fecha.nullable().optional(),
  motivoSobreElTope: textoOpcional(300, 'El motivo admite hasta 300 caracteres.'),
  motivoConRetencion: textoOpcional(300, 'El motivo admite hasta 300 caracteres.'),
});

/** Asignar: de 1 a 100 documentos de la bandeja, cada uno una sola vez. */
export const esquemaAsignarDocumentos = z.object({
  documentos: z
    .array(documentoPorAsignar)
    .min(1, 'Escoja al menos un documento.')
    .max(MAXIMO_DE_DOCUMENTOS, `Se asignan hasta ${MAXIMO_DE_DOCUMENTOS} documentos a la vez.`)
    .refine((lista) => new Set(lista.map(({ comprobanteId }) => comprobanteId)).size === lista.length, {
      error: 'Un documento no puede repetirse.',
    }),
});

export const esquemaValeDeGasto = z.object({
  fecha: fecha.nullable().optional(),
  monto: z.string().trim().regex(DINERO, 'Escriba el monto con hasta dos decimales.'),
  descripcion: texto(300, 'Escriba la descripción del gasto.'),
  pagadoA: texto(150, 'Escriba a quién se pagó.'),
  conceptoDeGastoId: z.uuid({ error: 'Escoja el concepto de gasto.' }),
  motivoSinDocumento: texto(300, 'Escriba por qué no hay factura.'),
  motivoSobreElTope: textoOpcional(300, 'El motivo admite hasta 300 caracteres.'),
});

/** Devolver a la bandeja y anular piden el motivo. */
export const esquemaConMotivo = z.object({ motivo });

export const esquemaParamsDeComprobante = z.object({ id: z.uuid() });

export const esquemaBandeja = z.object({
  proveedorId: z.uuid().optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  conRetencion: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
});

export const esquemaComprobantesDelFondo = z.object({
  estado: z.enum(['pendiente', 'repuesto', 'anulado', 'todos']).default('pendiente'),
});

export type AsignarDocumentosSolicitado = z.infer<typeof esquemaAsignarDocumentos>;
export type ValeDeGastoSolicitado = z.infer<typeof esquemaValeDeGasto>;
export type ConMotivoSolicitado = z.infer<typeof esquemaConMotivo>;
export type ParamsDeComprobante = z.infer<typeof esquemaParamsDeComprobante>;
export type BandejaSolicitada = z.output<typeof esquemaBandeja>;
export type ComprobantesDelFondoSolicitados = z.output<typeof esquemaComprobantesDelFondo>;
