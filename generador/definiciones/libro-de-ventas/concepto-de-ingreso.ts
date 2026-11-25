import { definirRecurso, lista, texto } from '../../src/definicion/indice.js';

/**
 * Concepto de ingreso del Libro de ventas (LV-1 de `docs/modulos/diseno-cuentas-por-cobrar-y-ventas.md`, §5.1):
 * clasifica cada línea de un documento de venta y propone su columna del libro (bien o servicio). Se inactiva con
 * auditoría; solo se elimina si no tiene líneas y no es de sistema (a mano, sobre lo generado). El concepto de
 * sistema `venta_de_activo_fijo` no se edita ni se inactiva (también a mano). Genere su código con:
 *   npm run generar -- recurso libro-de-ventas/concepto-de-ingreso
 */
export const recurso = definirRecurso({
  modulo: 'libro-de-ventas',
  entidad: 'ConceptoDeIngreso',
  plural: 'ConceptosDeIngreso',
  textos: { singular: 'concepto de ingreso', plural: 'conceptos de ingreso' },
  genero: 'masculino',
  alcance: 'empresa',
  pantalla: 'catalogo',
  seccion: 'administracion',
  icono: 'Tags',
  baja: 'inactivar',
  campos: {
    nombre: texto({ requerido: true, unico: true, largoMaximo: 80 }),
    tipo: lista({ bien: 'Bien', servicio: 'Servicio' }, { requerido: true }),
  },
});
