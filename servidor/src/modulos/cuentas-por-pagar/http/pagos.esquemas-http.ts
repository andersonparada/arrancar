import { z } from 'zod';
import { textoOpcional } from './texto-opcional.js';
import { MAXIMO_DE_DOCUMENTOS_EN_PAGO } from '../dominio/registro-de-pago.js';

const DINERO = /^\d{1,12}(\.\d{1,2})?$/;
const LIMITE_POR_OMISION = 50;
const LIMITE_MAXIMO = 200;

const monto = z.string().trim().regex(DINERO, 'Escriba el monto con hasta dos decimales.');
const fecha = z.iso.date({ error: 'Escriba la fecha como AAAA-MM-DD.' });

const motivo = z.string().trim().min(1, 'Escriba el motivo.').max(300, 'El motivo admite hasta 300 caracteres.');

const lineas = z.array(z.object({ cargoId: z.uuid({ error: 'Escoja el documento.' }), monto })).min(1);

/** Lo común a toda forma de pago; las reglas de los montos, la fecha y las diferencias son del dominio y responden por campo. */
const comun = {
  proveedorId: z.uuid({ error: 'Escoja el proveedor.' }),
  fecha: fecha.optional(),
  referencia: textoOpcional(100, 'La referencia admite hasta 100 caracteres.'),
  observaciones: textoOpcional(500, 'Las observaciones admiten hasta 500 caracteres.'),
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
    paraAbonoEnCuenta: z.boolean().optional(),
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
  referencia: textoOpcional(100, 'La referencia admite hasta 100 caracteres.'),
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
  referencia: textoOpcional(100, 'La referencia admite hasta 100 caracteres.'),
  observaciones: comun.observaciones,
  aplicaciones: comun.aplicaciones,
  /** El cheque en circulación de la carga inicial que pagó lo mismo: solo informativo (§2.4). */
  chequeDeAperturaReferidoId: z.uuid({ error: 'Escoja el cheque de apertura.' }).optional(),
});

/**
 * Pagar saldos iniciales con un posfechado de apertura que ya estaba en Bancos (§2.3): el monto y la fecha son los del
 * cheque, así que no se piden; no lleva referencia ni diferencias.
 */
export const esquemaPagoConChequeDeApertura = z.object({
  forma: z.literal('cheque_de_apertura'),
  movimientoId: z.uuid({ error: 'Escoja el cheque.' }),
  proveedorId: comun.proveedorId,
  observaciones: comun.observaciones,
  aplicaciones: comun.aplicaciones,
});

/** Desligar el posfechado de apertura de su pago. */
export const esquemaDesligarChequeDeApertura = z.object({ motivo });

export const esquemaParamsDePago = z.object({ id: z.uuid() });

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
export type PagoConChequeDeAperturaSolicitado = z.infer<typeof esquemaPagoConChequeDeApertura>;
export type DesligarChequeDeAperturaSolicitado = z.infer<typeof esquemaDesligarChequeDeApertura>;
export type NotasParaLigarSolicitado = z.output<typeof esquemaNotasParaLigar>;
export type ParaPagarSolicitado = z.infer<typeof esquemaParaPagar>;
export type MediosSolicitado = z.infer<typeof esquemaMedios>;
export type ProveedoresPorPagarSolicitado = z.output<typeof esquemaProveedoresPorPagar>;
export type ParamsDePago = z.infer<typeof esquemaParamsDePago>;
export type AnularPagoSolicitado = z.infer<typeof esquemaAnularPago>;
export type ReaplicarPagoSolicitado = z.infer<typeof esquemaReaplicarPago>;
export type SaldarDiferenciaSolicitada = z.infer<typeof esquemaSaldarDiferencia>;
