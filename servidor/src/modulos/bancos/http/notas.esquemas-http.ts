import { z } from 'zod';
import {
  decimalObligatorio,
  decimalOpcional,
  fechaObligatoria,
  idObligatorio,
  opcionObligatoria,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { MAXIMO_DE_MOVIMIENTOS_A_RECLASIFICAR } from '../dominio/errores-de-conceptos.js';

/** Forma de lo que llega al registrar o corregir una nota; nunca trae `saldoInicial`: eso se registra en la cuenta. */
export const esquemaNota = z
  .object({
    cuentaBancariaId: idObligatorio(),
    tipo: opcionObligatoria(['credito', 'debito']),
    fecha: fechaObligatoria(),
    monto: decimalObligatorio(2),
    referencia: textoOpcional(150),
    beneficiario: textoOpcional(150),
    observaciones: textoOpcional(2000),
    /** Obligatorio, salvo al registrar la nota ya marcada (la marca fija el concepto). */
    conceptoId: idObligatorio().optional(),
    /** Solo con un concepto que pide datos de intereses (H8): el bruto y el ISR retenido; `monto` es el neto. */
    interesBruto: decimalOpcional(2),
    isrRetenido: decimalOpcional(2),
    /** Registrar la nota de débito ya marcada para Cuentas por pagar (exige ese módulo activo). */
    marcarParaCuentasPorPagar: z.boolean().optional(),
  })
  .refine((nota) => nota.marcarParaCuentasPorPagar || nota.conceptoId, {
    path: ['conceptoId'],
    message: 'Elija una opción.',
  });

/** Quitar la marca: el motivo queda en la auditoría y el concepto es el que la nota lleva en adelante. */
export const esquemaDesmarcado = z.object({
  motivo: z.string().trim().min(1).max(500),
  conceptoId: idObligatorio(),
});

/** Filtros de la lista: de una cuenta y entre dos fechas (`AAAA-MM-DD`, incluidas). */
export const esquemaFiltroDeNotas = z.object({
  cuentaBancariaId: z.uuid().optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  conceptoId: z.uuid().optional(),
});

/** Cambiar solo el concepto de hasta 200 movimientos a la vez (todo o nada). */
export const esquemaReclasificacion = z.object({
  movimientoIds: z.array(z.uuid()).min(1).max(MAXIMO_DE_MOVIMIENTOS_A_RECLASIFICAR),
  conceptoId: z.uuid(),
});

/** Aceptar sugerencias: cada movimiento con su concepto, hasta 200 y sin repetir movimientos (todo o nada). */
export const esquemaReclasificacionVarios = z.object({
  asignaciones: z
    .array(z.object({ movimientoId: z.uuid(), conceptoId: z.uuid() }))
    .min(1)
    .max(MAXIMO_DE_MOVIMIENTOS_A_RECLASIFICAR)
    .refine((lista) => new Set(lista.map((a) => a.movimientoId)).size === lista.length, 'Hay movimientos repetidos.'),
  porSugerencia: z.boolean(),
});

export type DesmarcadoSolicitado = z.infer<typeof esquemaDesmarcado>;
export type NotaSolicitada = z.infer<typeof esquemaNota>;
export type ReclasificacionSolicitada = z.infer<typeof esquemaReclasificacion>;
export type ReclasificacionVariosSolicitada = z.infer<typeof esquemaReclasificacionVarios>;
export type FiltroDeNotasSolicitado = z.infer<typeof esquemaFiltroDeNotas>;
