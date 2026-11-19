import { z } from 'zod';
import { MAXIMO_DE_DOCUMENTOS_EN_PAGO } from '../dominio/registro-de-pago.js';

const DINERO = /^\d{1,12}(\.\d{1,2})?$/;
const LIMITE_POR_OMISION = 50;
const LIMITE_MAXIMO = 200;

const monto = z.string().trim().regex(DINERO, 'Escriba el monto con hasta dos decimales.');
const fecha = z.iso.date({ error: 'Escriba la fecha como AAAA-MM-DD.' });

const lineas = z.array(z.object({ cargoId: z.uuid({ error: 'Escoja el documento.' }), monto })).min(1);

/** Texto opcional con tope: sin espacios a los lados y el vacío es nulo, como pide la restricción de la tabla (400 por campo, no 500). */
const textoConTope = (maximo: number, aviso: string) =>
  z
    .string()
    .trim()
    .max(maximo, aviso)
    .transform((valor) => (valor === '' ? null : valor))
    .nullable()
    .optional();

/** Lo común a toda forma de pago; las reglas de los montos, la fecha y las diferencias son del dominio y responden por campo. */
const comun = {
  proveedorId: z.uuid({ error: 'Escoja el proveedor.' }),
  fecha: fecha.optional(),
  referencia: textoConTope(100, 'La referencia admite hasta 100 caracteres.'),
  observaciones: textoConTope(500, 'Las observaciones admiten hasta 500 caracteres.'),
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

/** Ligar una nota de débito que ya estaba en Bancos, marcada para Cuentas por pagar; `referencia` es el recibo del proveedor. */
export const esquemaPagoLigado = z.object({
  forma: z.literal('nota_ligada'),
  movimientoId: z.uuid({ error: 'Escoja la nota.' }),
  ...comun,
  referencia: z.string().trim().min(1).max(100, 'La referencia admite hasta 100 caracteres.').nullable().optional(),
});

/**
 * Aplicar saldos iniciales a la cuenta de apertura: el motivo es obligatorio y `referencia` es el comprobante del sistema
 * anterior. Con la carga abierta la fecha es la de inicio, se mande o no; no lleva diferencias.
 */
export const esquemaPagoDeApertura = z.object({
  forma: z.literal('cuenta_de_apertura'),
  proveedorId: comun.proveedorId,
  fecha: comun.fecha,
  motivo: z.string().trim().min(1, 'Escriba el motivo.').max(300, 'El motivo admite hasta 300 caracteres.'),
  referencia: z.string().trim().min(1).max(100, 'La referencia admite hasta 100 caracteres.').nullable().optional(),
  observaciones: comun.observaciones,
  aplicaciones: comun.aplicaciones,
});

export const esquemaParamsDePago = z.object({ id: z.uuid() });

const motivo = z.string().trim().min(1, 'Escriba el motivo.').max(300, 'El motivo admite hasta 300 caracteres.');

/** Anular un pago: el motivo y, si movió dinero, la fecha del inverso en Bancos (por omisión la decide Bancos). */
export const esquemaAnularPago = z.object({ motivo, fecha: fecha.optional() });

/** Reaplicar un pago a otros cargos de las contraseñas vigentes del proveedor; la suma no cambia. */
export const esquemaReaplicarPago = z.object({
  motivo,
  aplicaciones: lineas.max(MAXIMO_DE_DOCUMENTOS_EN_PAGO + 1),
});

/** Dar por saldada la diferencia de centavos de un cargo del pago. */
export const esquemaSaldarDiferencia = z.object({
  cargoId: z.uuid({ error: 'Escoja el documento.' }),
  monto,
  fecha: fecha.optional(),
});

export const esquemaParaPagar = z.object({ contrasenaId: z.uuid().optional(), fecha: fecha.optional() });
export const esquemaMedios = z.object({ fecha: fecha.optional() });

const comoBooleano = z.enum(['true', 'false']).transform((valor) => valor === 'true');

/** Las notas marcadas para Cuentas por pagar; por omisión, solo las que todavía tienen algo por aplicar. */
export const esquemaNotasParaLigar = z.object({
  cuentaBancariaId: z.uuid().optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  soloConDisponible: comoBooleano.default(true),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_OMISION),
});

export const esquemaProveedoresPorPagar = z.object({
  buscar: z.string().trim().min(1).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_OMISION),
});

export type PagoSolicitado = z.infer<typeof esquemaPago>;
export type PagoLigadoSolicitado = z.infer<typeof esquemaPagoLigado>;
export type PagoDeAperturaSolicitado = z.infer<typeof esquemaPagoDeApertura>;
export type NotasParaLigarSolicitado = z.output<typeof esquemaNotasParaLigar>;
export type ParaPagarSolicitado = z.infer<typeof esquemaParaPagar>;
export type MediosSolicitado = z.infer<typeof esquemaMedios>;
export type ProveedoresPorPagarSolicitado = z.output<typeof esquemaProveedoresPorPagar>;
export type ParamsDePago = z.infer<typeof esquemaParamsDePago>;
export type AnularPagoSolicitado = z.infer<typeof esquemaAnularPago>;
export type ReaplicarPagoSolicitado = z.infer<typeof esquemaReaplicarPago>;
export type SaldarDiferenciaSolicitada = z.infer<typeof esquemaSaldarDiferencia>;
