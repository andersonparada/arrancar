import { definirRecurso, texto } from '../../src/definicion/indice.js';

/**
 * Tipo de localidad (finca, planta, oficina…): catálogo editable de cada empresa (H5b del
 * plan de hallazgos contables). La semilla es solo un punto de partida.
 * Genere su código con:
 *   npm run generar -- recurso empresas/tipo-de-localidad
 */
export const recurso = definirRecurso({
  modulo: 'empresas',
  entidad: 'TipoDeLocalidad',
  plural: 'TiposDeLocalidad',
  textos: { singular: 'tipo de localidad', plural: 'tipos de localidad' },
  genero: 'masculino',
  alcance: 'empresa',
  pantalla: 'catalogo',
  seccion: 'administracion',
  icono: 'MapPinned',
  baja: 'inactivar',
  campos: {
    nombre: texto({ requerido: true, unico: true, largoMaximo: 60 }),
  },
});
