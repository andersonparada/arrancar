import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';

/** Constructores de las columnas de los Excel de reporte: nada se importa, así que ninguna es obligatoria. */
export const dinero = (clave: string, titulo: string): Columna => ({
  clave,
  titulo,
  requerido: false,
  tipo: 'decimal',
});
export const texto = (clave: string, titulo: string): Columna => ({ clave, titulo, requerido: false, tipo: 'texto' });
export const fecha = (clave: string, titulo: string): Columna => ({ clave, titulo, requerido: false, tipo: 'fecha' });
export const entero = (clave: string, titulo: string): Columna => ({ clave, titulo, requerido: false, tipo: 'entero' });
export const siNo = (clave: string, titulo: string): Columna => ({ clave, titulo, requerido: false, tipo: 'siNo' });
export const seccion: Columna = { clave: 'seccion', titulo: 'Sección', requerido: true, tipo: 'texto' };
