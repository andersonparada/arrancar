import { definirRecurso, lista, siNo, texto } from '../../src/definicion/indice.js';

/**
 * Concepto de gasto del Libro de compras (L2-1 del diseño de datos): clasifica cada línea de un
 * documento y propone su tipo, si es producto agropecuario y si es activo fijo. No se elimina:
 * lo usan los documentos, así que se inactiva. Genere su código con:
 *   npm run generar -- recurso libro-de-compras/concepto-de-gasto
 */
export const recurso = definirRecurso({
  modulo: 'libro-de-compras',
  entidad: 'ConceptoDeGasto',
  plural: 'ConceptosDeGasto',
  textos: { singular: 'concepto de gasto', plural: 'conceptos de gasto' },
  genero: 'masculino',
  alcance: 'empresa',
  pantalla: 'catalogo',
  seccion: 'administracion',
  icono: 'Tags',
  baja: 'inactivar',
  campos: {
    nombre: texto({ requerido: true, unico: true, largoMaximo: 120 }),
    tipoPorOmision: lista({ bien: 'Bien', servicio: 'Servicio' }, { requerido: true, etiqueta: 'Tipo por omisión' }),
    esProductoAgropecuario: siNo({ etiqueta: 'Es producto agropecuario' }),
    esActivoFijo: siNo({ etiqueta: 'Es activo fijo' }),
  },
});
