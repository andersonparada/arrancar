import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';

/** Las columnas del Excel de los conceptos de ingreso: los mismos datos del formulario, en el mismo orden. */
export const columnasDeConceptosDeIngreso = (): Columna[] => [
  { clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' },
  { clave: 'tipo', titulo: 'Tipo', requerido: true, tipo: 'lista', opciones: { bien: 'Bien', servicio: 'Servicio' } },
  { clave: 'activo', titulo: 'Activo', requerido: true, tipo: 'siNo' },
];
