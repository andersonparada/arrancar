import { z } from 'zod';
import {
  decimalObligatorio,
  decimalOpcional,
  enteroOpcional,
  fechaObligatoria,
  idOpcional,
  opcionObligatoria,
  opcionOpcional,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { PARTES_QUE_SE_AGREGAN } from '../dominio/partes-de-apertura.js';

export const esquemaParamsDeCuenta = z.object({ cuentaBancariaId: z.uuid() });
export const esquemaParamsDePartida = esquemaParamsDeCuenta.extend({ movimientoId: z.uuid() });

/**
 * La cabecera: el saldo según el estado de cuenta al corte (con signo) y, solo para comparar, el saldo de la cuenta
 * contable en los libros anteriores.
 */
export const esquemaGuardarSaldoInicial = z.object({
  saldoSegunEstadoDeCuenta: decimalObligatorio(2),
  saldoSegunLibrosAnteriores: decimalOpcional(2),
  observaciones: textoOpcional(500),
});

const camposDeLaPartida = {
  fecha: fechaObligatoria(),
  monto: decimalObligatorio(2),
  /** Solo en el error del banco: si suma (`credito`) o resta (`debito`). */
  sentido: opcionOpcional(['credito', 'debito']),
  /** Solo en el cheque posfechado: el concepto de egreso con que cuenta en el flujo. */
  conceptoId: idOpcional(),
  serie: textoOpcional(20),
  numeroDeCheque: enteroOpcional(),
  beneficiario: textoOpcional(150),
  referencia: textoOpcional(150),
  observaciones: textoOpcional(500),
};

export const esquemaPartida = z.object({
  parte: opcionObligatoria(PARTES_QUE_SE_AGREGAN),
  ...camposDeLaPartida,
});

/** La parte de una partida no se cambia al corregirla. */
export const esquemaCorreccionDePartida = z.object(camposDeLaPartida);

export type ParamsDeCuenta = z.infer<typeof esquemaParamsDeCuenta>;
export type ParamsDePartida = z.infer<typeof esquemaParamsDePartida>;
export type GuardarSaldoInicialSolicitado = z.infer<typeof esquemaGuardarSaldoInicial>;
export type PartidaSolicitada = z.infer<typeof esquemaPartida>;
export type CorreccionDePartidaSolicitada = z.infer<typeof esquemaCorreccionDePartida>;
