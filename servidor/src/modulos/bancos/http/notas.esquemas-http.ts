import { z } from 'zod';
import {
  decimalObligatorio,
  fechaObligatoria,
  idObligatorio,
  opcionObligatoria,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { MAXIMO_DE_MOVIMIENTOS_A_RECLASIFICAR } from '../dominio/errores-de-conceptos.js';

/** Forma de lo que llega al registrar o corregir una nota; nunca trae `saldoInicial`: eso se registra en la cuenta. */
export const esquemaNota = z.object({
  cuentaBancariaId: idObligatorio(),
  tipo: opcionObligatoria(['credito', 'debito']),
  fecha: fechaObligatoria(),
  monto: decimalObligatorio(2),
  referencia: textoOpcional(150),
  beneficiario: textoOpcional(150),
  observaciones: textoOpcional(2000),
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

export type NotaSolicitada = z.infer<typeof esquemaNota>;
export type ReclasificacionSolicitada = z.infer<typeof esquemaReclasificacion>;
export type FiltroDeNotasSolicitado = z.infer<typeof esquemaFiltroDeNotas>;
