import type { Columna, OpcionDeReferencia } from '../../core/intercambio/aplicacion/columnas.js';

/** Las columnas del Excel de las localidades: los mismos datos del formulario, en el mismo orden. */
export const columnasDeLocalidades = (opciones: Record<'tipoId', () => Promise<OpcionDeReferencia[]>>): Columna[] => [
  { clave: 'codigo', titulo: 'Código interno', requerido: true, tipo: 'texto' },
  { clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' },
  {
    clave: 'tipoId',
    titulo: 'Tipo',
    requerido: true,
    tipo: 'referencia',
    campoDeNombre: 'tipoNombre',
    opciones: opciones.tipoId,
  },
  { clave: 'codigoEstablecimientoSat', titulo: 'Código de establecimiento SAT', requerido: false, tipo: 'entero' },
  { clave: 'nombreComercialSat', titulo: 'Nombre comercial SAT', requerido: false, tipo: 'texto' },
  { clave: 'departamentoCodigo', titulo: 'Departamento', requerido: false, tipo: 'texto' },
  { clave: 'municipioCodigo', titulo: 'Municipio', requerido: false, tipo: 'texto' },
  { clave: 'direccion', titulo: 'Dirección', requerido: false, tipo: 'texto' },
  { clave: 'activo', titulo: 'Activo', requerido: true, tipo: 'siNo' },
];
