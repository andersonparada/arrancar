import type { AlcanceDeRegistros } from '../../../core/base-datos/alcance.js';

/**
 * Dónde se guardan las asignaciones de las localidades. Vive aparte de las tablas para que
 * `localidades.tablas.ts` y `accesos-a-localidades.tablas.ts` no se importen entre sí, y para que
 * los módulos que apunten a localidades construyan sus políticas con el mismo descriptor.
 */
export const ALCANCE_DE_LOCALIDADES: AlcanceDeRegistros = {
  recurso: 'empresas.localidades',
  tablaDeAccesos: 'empresas.accesos_a_localidades',
  tablaDelRegistro: 'empresas.localidades',
  columna: 'localidad_id',
};
