import { definirRecurso, texto } from '../../src/definicion/indice.js';

/**
 * Combustible del Libro de compras (L2-3 del diseño de datos): su tasa de IDP vive en sus vigencias
 * (`vigencia-de-combustible`). No se elimina: lo usan los documentos, así que se inactiva. Genere su código con:
 *   npm run generar -- recurso libro-de-compras/combustible
 */
export const recurso = definirRecurso({
  modulo: 'libro-de-compras',
  entidad: 'Combustible',
  plural: 'Combustibles',
  textos: { singular: 'combustible', plural: 'combustibles' },
  genero: 'masculino',
  alcance: 'empresa',
  pantalla: 'catalogo',
  seccion: 'administracion',
  icono: 'Fuel',
  baja: 'inactivar',
  campos: {
    nombre: texto({ requerido: true, unico: true, largoMaximo: 80 }),
  },
});
