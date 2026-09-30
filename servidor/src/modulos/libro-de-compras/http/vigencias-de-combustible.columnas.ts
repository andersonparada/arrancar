import type { Columna, OpcionDeReferencia } from '../../core/intercambio/aplicacion/columnas.js';

/** Las columnas del Excel de las vigencias de combustible: los mismos datos del formulario, en el mismo orden. */
export const columnasDeVigenciasDeCombustible = (
  opciones: Record<'combustibleId', () => Promise<OpcionDeReferencia[]>>,
): Columna[] => [
  {
    clave: 'combustibleId',
    titulo: 'Combustible',
    requerido: true,
    tipo: 'referencia',
    campoDeNombre: 'combustibleNombre',
    opciones: opciones.combustibleId,
  },
  { clave: 'idpPorGalon', titulo: 'IDP por galón (Q)', requerido: true, tipo: 'decimal' },
  { clave: 'porcentajeDeEtanol', titulo: 'Porcentaje de etanol', requerido: true, tipo: 'decimal' },
  { clave: 'vigenteDesde', titulo: 'Vigente desde', requerido: true, tipo: 'fecha' },
  { clave: 'vigenteHasta', titulo: 'Vigente hasta', requerido: false, tipo: 'fecha' },
];
