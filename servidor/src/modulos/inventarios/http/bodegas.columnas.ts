import type { Columna, OpcionDeReferencia } from '../../core/intercambio/aplicacion/columnas.js';

/**
 * Las columnas del Excel de las bodegas: los mismos datos del formulario, en el mismo orden. La localidad se escribe
 * por su nombre. El responsable con usuario no va en el Excel: se elige en el formulario (también recibe su acceso).
 */
export const columnasDeBodegas = (opciones: { localidadId: () => Promise<OpcionDeReferencia[]> }): Columna[] => [
  { clave: 'codigo', titulo: 'Código', requerido: true, tipo: 'texto' },
  { clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' },
  {
    clave: 'localidadId',
    titulo: 'Localidad',
    requerido: false,
    tipo: 'referencia',
    campoDeNombre: 'localidadNombre',
    opciones: opciones.localidadId,
  },
  { clave: 'responsable', titulo: 'Responsable', requerido: false, tipo: 'texto' },
  { clave: 'activo', titulo: 'Activo', requerido: true, tipo: 'siNo' },
];
