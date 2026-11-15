import { z } from 'zod';
import { MAXIMO_DE_DOCUMENTOS_EN_PAGO } from '../dominio/registro-de-pago.js';

const DINERO = /^\d{1,12}(\.\d{1,2})?$/;
const LIMITE_POR_OMISION = 50;
const LIMITE_MAXIMO = 200;

const monto = z.string().trim().regex(DINERO, 'Escriba el monto con hasta dos decimales.');
const fecha = z.iso.date({ error: 'Escriba la fecha como AAAA-MM-DD.' });

const lineas = z.array(z.object({ cargoId: z.uuid({ error: 'Escoja el documento.' }), monto })).min(1);

/** Lo común a toda forma de pago; las reglas de los montos, la fecha y las diferencias son del dominio y responden por campo. */
const comun = {
  proveedorId: z.uuid({ error: 'Escoja el proveedor.' }),
  fecha: fecha.optional(),
  referencia: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
  aplicaciones: lineas.max(MAXIMO_DE_DOCUMENTOS_EN_PAGO + 1),
  diferencias: lineas.max(MAXIMO_DE_DOCUMENTOS_EN_PAGO + 1).optional(),
};

/** Un pago con cheque (por omisión el siguiente de la chequera y no negociable) o con nota de débito. */
export const esquemaPago = z.discriminatedUnion('forma', [
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
    ...comun,
  }),
]);

export const esquemaParaPagar = z.object({ contrasenaId: z.uuid().optional(), fecha: fecha.optional() });
export const esquemaMedios = z.object({ fecha: fecha.optional() });

export const esquemaProveedoresPorPagar = z.object({
  buscar: z.string().trim().min(1).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_OMISION),
});

export type PagoSolicitado = z.infer<typeof esquemaPago>;
export type ParaPagarSolicitado = z.infer<typeof esquemaParaPagar>;
export type MediosSolicitado = z.infer<typeof esquemaMedios>;
export type ProveedoresPorPagarSolicitado = z.output<typeof esquemaProveedoresPorPagar>;
