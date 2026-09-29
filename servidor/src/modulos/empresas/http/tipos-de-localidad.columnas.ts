import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';

/** Las columnas del Excel de los tipos de localidad: los mismos datos del formulario, en el mismo orden. */
export const columnasDeTiposDeLocalidad = (): Columna[] => [
  { clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' },
  { clave: 'activo', titulo: 'Activo', requerido: true, tipo: 'siNo' },
];
