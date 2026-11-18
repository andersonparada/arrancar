import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';

/**
 * Las columnas del Excel de las empresas: los datos del formulario de crear. Quedan fuera los datos fiscales y
 * la fecha de inicio, que los aportan otros módulos o la carga inicial y se completan desde la ficha de la empresa.
 */
export const columnasDeEmpresas: Columna[] = [
  { clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' },
  { clave: 'nit', titulo: 'NIT', requerido: false, tipo: 'texto' },
  { clave: 'direccion', titulo: 'Dirección', requerido: false, tipo: 'texto' },
  { clave: 'telefono', titulo: 'Teléfono', requerido: false, tipo: 'texto' },
  { clave: 'correo', titulo: 'Correo', requerido: false, tipo: 'texto' },
  { clave: 'activa', titulo: 'Activa', requerido: true, tipo: 'siNo' },
];
