import { z } from 'zod';
import { MESES_MAXIMOS_DE_VENCIMIENTO, MESES_MINIMOS_DE_VENCIMIENTO } from '../dominio/cheques-en-circulacion.js';

/** Filtro del reporte de cheques caducos: sin `meses`, manda la variable de la empresa. */
export const esquemaFiltroDeChequesCaducos = z.object({
  cuentaBancariaId: z.uuid().optional(),
  beneficiario: z.string().trim().min(1).max(150).optional(),
  meses: z.coerce.number().int().min(MESES_MINIMOS_DE_VENCIMIENTO).max(MESES_MAXIMOS_DE_VENCIMIENTO).optional(),
});

export type FiltroDeChequesCaducosSolicitado = z.infer<typeof esquemaFiltroDeChequesCaducos>;
