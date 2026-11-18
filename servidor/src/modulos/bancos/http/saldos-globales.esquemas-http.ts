import { z } from 'zod';
import {
  decimalObligatorio,
  fechaObligatoria,
  idObligatorio,
  opcionObligatoria,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';

/**
 * HEREDADO (hasta BS-5): lo que llega al registrar o corregir el saldo inicial «de antes» de una cuenta, como lo manda
 * el cliente actual; sin beneficiario (no aplica).
 */
export const esquemaSaldoGlobal = z.object({
  cuentaBancariaId: idObligatorio(),
  tipo: opcionObligatoria(['credito', 'debito']).default('credito'),
  fecha: fechaObligatoria(),
  monto: decimalObligatorio(2),
  referencia: textoOpcional(150),
  observaciones: textoOpcional(2000),
});

export const esquemaFiltroDeSaldosGlobales = z.object({ cuentaBancariaId: z.uuid().optional() });

export type SaldoGlobalSolicitado = z.infer<typeof esquemaSaldoGlobal>;
export type FiltroDeSaldosGlobalesSolicitado = z.infer<typeof esquemaFiltroDeSaldosGlobales>;
