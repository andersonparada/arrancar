import type { Columna, OpcionDeReferencia } from '../../core/intercambio/aplicacion/columnas.js';

/** Las columnas del Excel de las chequeras: cuenta, serie y rango, en el mismo orden del formulario. */
export const columnasDeChequeras = (
  opciones: Record<'cuentaBancariaId', () => Promise<OpcionDeReferencia[]>>,
): Columna[] => [
  {
    clave: 'cuentaBancariaId',
    titulo: 'Cuenta',
    requerido: true,
    tipo: 'referencia',
    campoDeNombre: 'cuentaBancariaNombre',
    opciones: opciones.cuentaBancariaId,
  },
  { clave: 'serie', titulo: 'Serie', requerido: false, tipo: 'texto' },
  { clave: 'desde', titulo: 'Desde', requerido: true, tipo: 'entero' },
  { clave: 'hasta', titulo: 'Hasta', requerido: true, tipo: 'entero' },
];
