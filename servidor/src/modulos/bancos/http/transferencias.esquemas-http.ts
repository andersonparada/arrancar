import { z } from 'zod';
import {
  decimalObligatorio,
  fechaObligatoria,
  idObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar una transferencia; las reglas de negocio las revisa el dominio. */
export const esquemaTransferencia = z.object({
  cuentaOrigenId: idObligatorio(),
  cuentaDestinoId: idObligatorio(),
  fecha: fechaObligatoria(),
  monto: decimalObligatorio(2),
  referencia: textoOpcional(150),
  observaciones: textoOpcional(2000),
});

export const esquemaParamsTransferencia = z.object({ transferenciaId: z.uuid() });

export const esquemaAnulacionDeTransferencia = z.object({ motivo: z.string().trim().min(1).max(500) });

export type TransferenciaSolicitada = z.infer<typeof esquemaTransferencia>;
export type ParamsTransferencia = z.infer<typeof esquemaParamsTransferencia>;
export type SolicitudDeAnulacionDeTransferencia = z.infer<typeof esquemaAnulacionDeTransferencia>;
