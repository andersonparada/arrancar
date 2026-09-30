import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';

/** Las columnas del Excel de los conceptos de gasto: los mismos datos del formulario, en el mismo orden. */
export const columnasDeConceptosDeGasto = (): Columna[] => [
  { clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' },
  {
    clave: 'tipoPorOmision',
    titulo: 'Tipo por omisión',
    requerido: true,
    tipo: 'lista',
    opciones: { bien: 'Bien', servicio: 'Servicio' },
  },
  { clave: 'esProductoAgropecuario', titulo: 'Es producto agropecuario', requerido: true, tipo: 'siNo' },
  { clave: 'esActivoFijo', titulo: 'Es activo fijo', requerido: true, tipo: 'siNo' },
  { clave: 'activo', titulo: 'Activo', requerido: true, tipo: 'siNo' },
];
