import { definirRecurso, texto } from '../../src/definicion/indice.js';

/**
 * Tipo de parcela (potrero, lote, tablón…): catálogo editable de cada empresa (PA-11 de
 * `docs/modulos/diseno-parcelas.md`). Se siembra al listar por primera vez. Genere su código con:
 *   npm run generar -- recurso parcelas/tipo-de-parcela
 */
export const recurso = definirRecurso({
  modulo: 'parcelas',
  entidad: 'TipoDeParcela',
  plural: 'TiposDeParcela',
  textos: { singular: 'tipo de parcela', plural: 'tipos de parcela' },
  genero: 'masculino',
  alcance: 'empresa',
  pantalla: 'catalogo',
  seccion: 'administracion',
  icono: 'Shapes',
  baja: 'inactivar',
  campos: {
    nombre: texto({ requerido: true, unico: true, largoMaximo: 60 }),
  },
});
