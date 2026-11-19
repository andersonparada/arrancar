import { z } from 'zod';
import { MAXIMO_DE_DOCUMENTOS_EN_PAGO } from '../dominio/registro-de-pago.js';
import { MAXIMO_DE_PAGOS_EN_REPARTO } from '../dominio/reparto-de-efectivo.js';

const DINERO = /^\d{1,12}(\.\d{1,2})?$/;

const monto = z.string().trim().regex(DINERO, 'Escriba el monto con hasta dos decimales.');
const lineas = z.array(z.object({ cargoId: z.uuid({ error: 'Escoja el documento.' }), monto })).min(1);

const texto = (maximo: number, aviso: string) => z.string().trim().min(1).max(maximo, aviso).nullable().optional();

/** Un pago del reparto: lo que se le entrega a un proveedor. Las reglas de montos, fecha y diferencias son del dominio. */
const pagoEnEfectivo = z.object({
  proveedorId: z.uuid({ error: 'Escoja el proveedor.' }),
  fecha: z.iso.date({ error: 'Escriba la fecha como AAAA-MM-DD.' }).optional(),
  recibidoPor: texto(150, 'El nombre de quien recibe admite hasta 150 caracteres.'),
  referencia: texto(100, 'La referencia admite hasta 100 caracteres.'),
  observaciones: z
    .string()
    .trim()
    .max(500, 'Las observaciones admiten hasta 500 caracteres.')
    .transform((valor) => (valor === '' ? null : valor))
    .nullable()
    .optional(),
  motivoSinBancarizar: texto(300, 'El motivo admite hasta 300 caracteres.'),
  aplicaciones: lineas.max(MAXIMO_DE_DOCUMENTOS_EN_PAGO + 1),
  diferencias: lineas.max(MAXIMO_DE_DOCUMENTOS_EN_PAGO + 1).optional(),
});

/** Repartir el efectivo de un retiro: de 1 a 20 pagos, uno por proveedor (el dominio revisa el límite y lo responde por campo). */
export const esquemaPagosEnEfectivo = z.object({
  pagos: z.array(pagoEnEfectivo).max(MAXIMO_DE_PAGOS_EN_REPARTO + 1),
});

export const esquemaParamsDeRetiroConPagos = z.object({ id: z.uuid() });

export type PagosEnEfectivoSolicitados = z.infer<typeof esquemaPagosEnEfectivo>;
export type ParamsDeRetiroConPagos = z.infer<typeof esquemaParamsDeRetiroConPagos>;
