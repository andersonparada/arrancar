import { z } from 'zod';
import {
  CLAVE_DE_NOTAS_DE_CREDITO,
  CLAVE_DE_NOTAS_DE_DEBITO,
  CLAVE_DE_TRANSFERENCIAS,
} from '../aplicacion/numeracion-de-comprobantes.js';

/** Filtro del reporte de correlativos: una sola clave; sin ella, todas las de Bancos. */
export const esquemaFiltroDeCorrelativos = z.object({
  clave: z.enum([CLAVE_DE_NOTAS_DE_CREDITO, CLAVE_DE_NOTAS_DE_DEBITO, CLAVE_DE_TRANSFERENCIAS]).optional(),
});

export type FiltroDeCorrelativosSolicitado = z.infer<typeof esquemaFiltroDeCorrelativos>;
