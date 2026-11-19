import type { z } from 'zod';
import { esquemaConsultaSerie } from '../../core/monedas/http/tipos-de-cambio.esquemas-http.js';

/**
 * Moneda y rango del reporte: las mismas reglas que la serie del núcleo (código de tres letras, fechas reales, desde no
 * posterior a hasta y máximo 366 días). El reporte y su Excel usan el mismo filtro.
 */
export const esquemaFiltroDeTiposDeCambio = esquemaConsultaSerie;

export type FiltroDeTiposDeCambioSolicitado = z.infer<typeof esquemaFiltroDeTiposDeCambio>;
