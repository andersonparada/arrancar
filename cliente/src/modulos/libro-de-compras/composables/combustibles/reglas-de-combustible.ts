import type { Combustible, DatosCombustible } from '../../servicios/combustibles.api';

export const NOMBRE_DE_COMBUSTIBLE = { conArticulo: 'el combustible', capitalizado: 'Combustible' };

/** Lo que se manda para inactivar o reactivar: el mismo combustible con `activo` invertido. */
export const datosParaCambiarEstado = (combustible: Combustible): DatosCombustible => ({
  nombre: combustible.nombre,
  activo: !combustible.activo,
});
