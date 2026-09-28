import { z } from 'zod';
import {
  decimalObligatorio,
  fechaObligatoria,
  idObligatorio,
  opcionObligatoria,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o corregir un movimiento; las reglas de negocio las revisa el dominio. */
export const esquemaMovimiento = z.object({
  cuentaBancariaId: idObligatorio(),
  tipo: opcionObligatoria(['credito', 'debito']),
  fecha: fechaObligatoria(),
  monto: decimalObligatorio(2),
  saldoInicial: z.boolean().default(false),
  referencia: textoOpcional(150),
  beneficiario: textoOpcional(150),
  observaciones: textoOpcional(2000),
});

export const esquemaParamsMovimiento = z.object({ movimientoId: z.uuid() });

export const esquemaAnulacion = z.object({ motivo: z.string().trim().min(1).max(500) });

/** Filtros de la lista: de una cuenta y entre dos fechas (`AAAA-MM-DD`, incluidas). */
export const esquemaFiltroDeMovimientos = z.object({
  cuentaBancariaId: z.uuid().optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
});

export type MovimientoSolicitado = z.infer<typeof esquemaMovimiento>;
export type ParamsMovimiento = z.infer<typeof esquemaParamsMovimiento>;
export type SolicitudDeAnulacion = z.infer<typeof esquemaAnulacion>;
export type FiltroSolicitado = z.infer<typeof esquemaFiltroDeMovimientos>;
