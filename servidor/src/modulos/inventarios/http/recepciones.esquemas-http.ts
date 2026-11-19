import { z } from 'zod';
import {
  decimalObligatorio,
  fechaObligatoria,
  fechaOpcional,
  idObligatorio,
  idOpcional,
  opcionObligatoria,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { BASES_DE_REBAJA } from '../dominio/rebaja.js';

const loteNuevo = z.object({
  codigo: textoObligatorio(40),
  fechaDeVencimiento: fechaOpcional(),
  fechaDeFabricacion: fechaOpcional(),
});

const renglonDeRecepcion = z
  .object({
    lineaId: idObligatorio(),
    articuloId: idObligatorio(),
    loteId: idOpcional(),
    loteNuevo: loteNuevo.nullish().transform((lote) => lote ?? null),
    cantidad: decimalObligatorio(4),
    unidadId: idOpcional(),
    monto: decimalObligatorio(2),
  })
  .refine((renglon) => !(renglon.loteId && renglon.loteNuevo), 'Elija un lote o escriba uno nuevo, no los dos.');

/** Cantidades y dinero viajan como texto; las reglas de negocio las revisa el dominio. */
export const esquemaRecepcion = z.object({
  fecha: fechaObligatoria(),
  bodegaId: idObligatorio(),
  observaciones: textoOpcional(500),
  renglones: z.array(renglonDeRecepcion).min(1, 'Agregue al menos un renglón.').max(200),
});

export const esquemaDevolucion = z.object({
  fecha: fechaObligatoria(),
  lineaId: idObligatorio(),
  observaciones: textoOpcional(500),
  renglones: z
    .array(
      z.object({
        movimientoDeEntradaId: idObligatorio(),
        cantidad: decimalObligatorio(4),
        unidadId: idOpcional(),
      }),
    )
    .min(1, 'Agregue al menos un renglón.')
    .max(200),
});

export const esquemaRebaja = z.object({
  fecha: fechaObligatoria(),
  lineaId: idObligatorio(),
  monto: decimalObligatorio(2),
  base: opcionObligatoria(BASES_DE_REBAJA),
  observaciones: textoOpcional(500),
});

export const esquemaDescarte = z.object({ motivo: textoObligatorio(300) });

export const esquemaFiltrosDePorRecibir = z.object({
  desde: fechaOpcional().optional(),
  hasta: fechaOpcional().optional(),
  proveedorId: z.uuid().optional(),
  conceptoId: z.uuid().optional(),
});

export const esquemaParamsLinea = z.object({ lineaId: z.uuid() });

export type RecepcionSolicitada = z.infer<typeof esquemaRecepcion>;
export type DevolucionSolicitada = z.infer<typeof esquemaDevolucion>;
export type RebajaSolicitada = z.infer<typeof esquemaRebaja>;
export type DescarteSolicitado = z.infer<typeof esquemaDescarte>;
export type FiltrosDePorRecibirSolicitados = z.infer<typeof esquemaFiltrosDePorRecibir>;
export type ParamsLinea = z.infer<typeof esquemaParamsLinea>;
