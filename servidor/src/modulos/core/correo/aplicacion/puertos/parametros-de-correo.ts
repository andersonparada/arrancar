import type { TopesDeCorreo } from '../../dominio/cupos-de-correo.js';

/** Lo que core.correo lee de la configuración (todo de nivel instalación). */
export interface ParametrosDeCorreo {
  topes(): Promise<TopesDeCorreo>;
  /** `core.interfaz.nombre_aplicacion`. */
  nombreDeLaAplicacion(): Promise<string>;
  conservacion(): Promise<{ diasDelContenido: number; mesesDeLosMetadatos: number }>;
}
