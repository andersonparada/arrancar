import type { AlcanceDeRegistros } from '../../../core/base-datos/alcance.js';

/**
 * Dónde se guardan las asignaciones de los fondos (quién ve y opera cada fondo). Vive aparte de las tablas para que
 * `fondos.tablas.ts` y `accesos-a-fondos.tablas.ts` no se importen entre sí y para que las tablas que apuntan a un
 * fondo construyan sus políticas con el mismo descriptor.
 */
export const ALCANCE_DE_FONDOS: AlcanceDeRegistros = {
  recurso: 'caja-chica.fondos',
  tablaDeAccesos: 'caja_chica.accesos_a_fondos',
  tablaDelRegistro: 'caja_chica.fondos',
  columna: 'fondo_id',
};
