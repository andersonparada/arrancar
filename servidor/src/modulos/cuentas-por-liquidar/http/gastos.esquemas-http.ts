import { z } from 'zod';

const DINERO = /^\d{1,12}(\.\d{1,2})?$/;

const fecha = z.iso.date({ error: 'Escriba la fecha como AAAA-MM-DD.' });
const comoBooleano = z.enum(['true', 'false']).transform((valor) => valor === 'true');

/** Texto opcional con tope: sin espacios a los lados y el vacío es nulo (la base no admite textos vacíos). */
const textoOpcional = (maximo: number, aviso: string) =>
  z
    .string()
    .trim()
    .max(maximo, aviso)
    .transform((valor) => (valor === '' ? null : valor))
    .nullable()
    .optional();

export const esquemaParamsDeGasto = z.object({ id: z.uuid() });

/** Una tanda de 1 a 100 documentos de la bandeja para un anticipo; el motivo de la retención solo donde aplica. */
export const esquemaAsignarGastos = z.object({
  documentos: z
    .array(
      z.object({
        gastoId: z.uuid({ error: 'Escoja el documento.' }),
        fecha: fecha.optional(),
        motivoConRetencion: textoOpcional(300, 'El motivo admite hasta 300 caracteres.'),
      }),
    )
    .min(1, 'Escoja al menos un documento.')
    .max(100, 'Se asignan hasta 100 documentos a la vez.'),
});

/** Un gasto sin documento: lo demás (textos, concepto, tratamiento) lo valida el dominio y responde por campo. */
export const esquemaGastoSinDocumento = z.object({
  fecha: fecha.optional(),
  monto: z.string().trim().regex(DINERO, 'Escriba el monto con hasta dos decimales.'),
  descripcion: z.string().trim().min(1, 'Escriba qué se compró.').max(300, 'Admite hasta 300 caracteres.'),
  pagadoA: z.string().trim().min(1, 'Escriba a quién se le pagó.').max(150, 'Admite hasta 150 caracteres.'),
  conceptoDeGastoId: z.uuid({ error: 'Escoja el concepto de gasto.' }),
  motivoSinDocumento: z
    .string()
    .trim()
    .min(1, 'Escriba por qué no hay documento.')
    .max(300, 'Admite hasta 300 caracteres.'),
  tratamiento: z.enum(['no_deducible', 'renta_del_trabajo']).optional(),
});

export const esquemaQuitarGasto = z.object({
  motivo: z.string().trim().min(1, 'Escriba el motivo.').max(300, 'El motivo admite hasta 300 caracteres.'),
});

/** La bandeja: filtros opcionales por proveedor, fechas del documento y si lleva retención. */
export const esquemaBandeja = z.object({
  proveedorId: z.uuid().optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  conRetencion: comoBooleano.optional(),
});

export type ParamsDeGasto = z.infer<typeof esquemaParamsDeGasto>;
export type AsignarGastosSolicitado = z.infer<typeof esquemaAsignarGastos>;
export type GastoSinDocumentoSolicitado = z.infer<typeof esquemaGastoSinDocumento>;
export type QuitarGastoSolicitado = z.infer<typeof esquemaQuitarGasto>;
export type BandejaSolicitada = z.output<typeof esquemaBandeja>;
