import { definirRecurso, texto } from '../../src/definicion/indice.js';

/**
 * Bodega de Inventarios (INV-2, `docs/modulos/diseno-inventarios.md` §3.5 y §5.5): lugar físico con existencias, con
 * alcance de registros propio (`inventarios.bodegas`, tabla `inventarios.accesos_a_bodegas`). La localidad y el
 * responsable con usuario, la asignación de usuarios y las reglas de inactivar y eliminar se agregan a mano sobre lo
 * generado. Genere su código con:
 *   npm run generar -- recurso inventarios/bodega
 */
export const recurso = definirRecurso({
  modulo: 'inventarios',
  entidad: 'Bodega',
  plural: 'Bodegas',
  textos: { singular: 'bodega', plural: 'bodegas' },
  genero: 'femenino',
  alcance: 'empresa',
  pantalla: 'completa',
  seccion: 'administracion',
  icono: 'Warehouse',
  baja: 'inactivar',
  campos: {
    codigo: texto({ requerido: true, unico: true, largoMaximo: 12, etiqueta: 'Código' }),
    nombre: texto({ requerido: true, unico: true, largoMaximo: 120 }),
    responsable: texto({ largoMaximo: 150 }),
  },
});
