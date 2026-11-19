import { z } from 'zod';
import {
  decimalObligatorio,
  decimalOpcional,
  enteroObligatorio,
  enteroOpcional,
  fechaObligatoria,
  fechaOpcional,
  idObligatorio,
  idOpcional,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al cargar o corregir el saldo inicial de un activo; las reglas las revisa el dominio. */
export const esquemaSaldoInicial = z.object({
  codigo: textoOpcional(30),
  descripcion: textoObligatorio(200),
  claseId: idObligatorio(),
  activoPadreId: idOpcional(),
  fechaDeAdquisicion: fechaObligatoria(),
  fechaDeInicioDeUso: fechaOpcional(),
  enConstruccion: z.boolean().default(false),
  cantidad: enteroObligatorio().min(1).default(1),
  costo: decimalObligatorio(2),
  depreciacionAcumuladaContable: decimalObligatorio(2),
  costoFiscal: decimalOpcional(2),
  baseFiscal: decimalOpcional(2),
  depreciacionAcumuladaFiscal: decimalObligatorio(2),
  porcentajeFiscal: decimalOpcional(2),
  vidaUtilRestanteMeses: enteroOpcional(),
  valorResidual: decimalOpcional(2),
  valorComoGanadoComun: decimalOpcional(2),
  valorDeMatricula: decimalOpcional(2),
  valorCatastral: decimalOpcional(2),
  valoresDelInmuebleCompleto: z.boolean().default(false),
  marca: textoOpcional(80),
  modelo: textoOpcional(80),
  numeroDeSerie: textoOpcional(80),
  placa: textoOpcional(80),
  observaciones: textoOpcional(500),
  localidadId: idOpcional(),
  departamentoId: idOpcional(),
  responsable: textoOpcional(150),
  enBodega: z.boolean().default(false),
});

/** En Excel el padre se escribe por su código: el caso de uso lo busca. */
export const esquemaSaldoInicialDeExcel = esquemaSaldoInicial
  .omit({ activoPadreId: true })
  .extend({ activoPadreCodigo: textoOpcional(30) });

export const esquemaParamsSaldoInicial = z.object({ activoId: z.uuid() });

export type SaldoInicialSolicitado = z.infer<typeof esquemaSaldoInicial>;
export type SaldoInicialDeExcel = z.infer<typeof esquemaSaldoInicialDeExcel>;
export type ParamsSaldoInicial = z.infer<typeof esquemaParamsSaldoInicial>;
