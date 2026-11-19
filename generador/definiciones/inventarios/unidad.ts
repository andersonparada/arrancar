import { decimal, definirRecurso, lista, texto } from '../../src/definicion/indice.js';

/**
 * Unidad de medida de Inventarios (INV-1 de `docs/modulos/diseno-inventarios.md`, §5.1). Las de masa, volumen,
 * longitud y superficie traen su factor a la unidad de referencia (libra, galón, metro, metro cuadrado); las demás
 * (caja, saco) se convierten por artículo. Se inactiva con auditoría; solo se elimina si ningún artículo la usa
 * (a mano, sobre lo generado). Genere su código con:
 *   npm run generar -- recurso inventarios/unidad
 */
export const recurso = definirRecurso({
  modulo: 'inventarios',
  entidad: 'Unidad',
  plural: 'Unidades',
  textos: { singular: 'unidad de medida', plural: 'unidades de medida' },
  genero: 'femenino',
  alcance: 'empresa',
  pantalla: 'catalogo',
  seccion: 'administracion',
  icono: 'Ruler',
  baja: 'inactivar',
  campos: {
    nombre: texto({ requerido: true, unico: true, largoMaximo: 40 }),
    simbolo: texto({ requerido: true, unico: true, largoMaximo: 10, etiqueta: 'Símbolo' }),
    magnitud: lista(
      {
        cantidad: 'Cantidad',
        masa: 'Masa',
        volumen: 'Volumen',
        longitud: 'Longitud',
        superficie: 'Superficie',
        empaque: 'Empaque',
      },
      { requerido: true },
    ),
    factorALaReferencia: decimal({ decimales: 4, etiqueta: 'Factor a la unidad de referencia' }),
  },
});
