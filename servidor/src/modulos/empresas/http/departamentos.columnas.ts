import type { Columna, OpcionDeReferencia } from '../../core/intercambio/aplicacion/columnas.js';

/** Las columnas del Excel de los departamentos: los mismos datos del formulario, en el mismo orden. */
export const columnasDeDepartamentos = (
  opciones: Record<'localidadId', () => Promise<OpcionDeReferencia[]>>,
): Columna[] => [
  { clave: 'codigo', titulo: 'Código interno', requerido: true, tipo: 'texto' },
  { clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' },
  {
    clave: 'localidadId',
    titulo: 'Localidad',
    requerido: false,
    tipo: 'referencia',
    campoDeNombre: 'localidadNombre',
    tambienPorCodigo: true,
    opciones: opciones.localidadId,
  },
  { clave: 'activo', titulo: 'Activo', requerido: true, tipo: 'siNo' },
];
