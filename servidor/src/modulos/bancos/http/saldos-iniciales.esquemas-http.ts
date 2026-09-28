import { z } from 'zod';
import {
  decimalObligatorio,
  fechaObligatoria,
  idObligatorio,
  opcionObligatoria,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o corregir el saldo inicial de una cuenta; sin beneficiario (no aplica). */
export const esquemaSaldoInicial = z.object({
  cuentaBancariaId: idObligatorio(),
  tipo: opcionObligatoria(['credito', 'debito']).default('credito'),
  fecha: fechaObligatoria(),
  monto: decimalObligatorio(2),
  referencia: textoOpcional(150),
  observaciones: textoOpcional(2000),
});

export const esquemaFiltroDeSaldosIniciales = z.object({ cuentaBancariaId: z.uuid().optional() });

export type SaldoInicialSolicitado = z.infer<typeof esquemaSaldoInicial>;
export type FiltroDeSaldosInicialesSolicitado = z.infer<typeof esquemaFiltroDeSaldosIniciales>;
