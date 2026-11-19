import type { AjustesDelAviso } from '../puertos/puertos-de-avisos-de-pago.js';

/** Lo que muestra la pantalla «Avisos de pago»: los ajustes de la empresa, los marcadores y los textos originales. */
export interface AjustesDelAvisoDto extends AjustesDelAviso {
  marcadoresDelAsunto: readonly string[];
  marcadoresDelMensaje: readonly string[];
  asuntoPorOmision: string;
  mensajePorOmision: string;
}
