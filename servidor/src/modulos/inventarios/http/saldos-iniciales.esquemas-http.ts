import { z } from 'zod';
import {
  decimalObligatorio,
  fechaOpcional,
  idObligatorio,
  idOpcional,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';

/** Cantidades y dinero viajan como texto; las reglas de negocio las revisa el dominio. */
export const esquemaSaldoInicial = z.object({
  articuloId: idObligatorio(),
  bodegaId: idObligatorio(),
  loteId: idOpcional(),
  loteCodigo: textoOpcional(40),
  loteVencimiento: fechaOpcional(),
  cantidad: decimalObligatorio(4),
  unidadId: idOpcional(),
  costoTotal: decimalObligatorio(2),
  fechaDeCapa: fechaOpcional(),
});

/** En Excel el lote se escribe por su código (y su vencimiento): el caso de uso lo busca o lo crea. */
export const esquemaSaldoInicialDeExcel = esquemaSaldoInicial.omit({ loteId: true }).extend({
  articuloId: idObligatorio(),
});

export const esquemaParamsSaldoInicial = z.object({ movimientoId: z.uuid() });

export type SaldoInicialSolicitado = z.infer<typeof esquemaSaldoInicial>;
export type SaldoInicialDeExcel = z.infer<typeof esquemaSaldoInicialDeExcel>;
export type ParamsSaldoInicial = z.infer<typeof esquemaParamsSaldoInicial>;
