import { z } from 'zod';
import { opcionObligatoria, textoObligatorio, textoOpcional } from '../../core/compartido/http/esquemas-comunes.js';

/** Forma de lo que llega al registrar o cambiar un concepto; las reglas de negocio las revisa el dominio. */
export const esquemaConcepto = z.object({
  nombre: textoObligatorio(150),
  aplicaA: opcionObligatoria(['credito', 'debito', 'ambos']),
  actividadDeFlujo: opcionObligatoria(['operacion', 'inversion', 'financiamiento', 'ninguna']),
  grupoDeFlujo: textoOpcional(150),
  esCargoBancario: z.boolean().default(false),
  pideDatosDeIntereses: z.boolean().default(false),
  admiteFactura: z.boolean().default(false),
  activo: z.boolean().default(true),
});

/** Quien elimina un concepto deja su motivo en la auditoría. */
export const esquemaEliminacionDeConcepto = z.object({ motivo: z.string().trim().min(1).max(500) });

export const esquemaParamsConcepto = z.object({ conceptoId: z.uuid() });

export type ConceptoSolicitado = z.infer<typeof esquemaConcepto>;
export type EliminacionDeConcepto = z.infer<typeof esquemaEliminacionDeConcepto>;
export type ParamsConcepto = z.infer<typeof esquemaParamsConcepto>;
