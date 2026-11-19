import { z } from 'zod';
import { ESQUEMAS_DE_AVISOS } from '../configuracion-de-avisos.js';

/** Los cinco ajustes, con el mismo esquema de la variable de configuración de cada uno. */
export const esquemaAjustesDelAviso = z.object(ESQUEMAS_DE_AVISOS);

export type AjustesDelAvisoSolicitados = z.infer<typeof esquemaAjustesDelAviso>;
