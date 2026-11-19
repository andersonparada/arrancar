import type { AlcanceDeRegistros } from '../../../core/base-datos/alcance.js';

/**
 * Dónde se guardan las asignaciones de las bodegas (quién ve y mueve cada bodega). Vive aparte de las tablas para que
 * `bodegas.tablas.ts` y `accesos-a-bodegas.tablas.ts` no se importen entre sí y para que las tablas que apuntan a una
 * bodega (documentos, existencias, ajustes, conteos…) construyan sus políticas con el mismo descriptor.
 */
export const ALCANCE_DE_BODEGAS: AlcanceDeRegistros = {
  recurso: 'inventarios.bodegas',
  tablaDeAccesos: 'inventarios.accesos_a_bodegas',
  tablaDelRegistro: 'inventarios.bodegas',
  columna: 'bodega_id',
};
