import { definirRecurso, referencia, texto } from '../../src/definicion/indice.js';

/**
 * Departamento de la empresa (área o unidad interna): puede pertenecer a una sola localidad o a toda
 * la empresa (H5c del plan de hallazgos contables). No confundir con los departamentos de Guatemala.
 * Genere su código con:
 *   npm run generar -- recurso empresas/departamento
 */
export const recurso = definirRecurso({
  modulo: 'empresas',
  entidad: 'Departamento',
  plural: 'Departamentos',
  textos: { singular: 'departamento', plural: 'departamentos' },
  genero: 'masculino',
  alcance: 'empresa',
  pantalla: 'catalogo',
  seccion: 'administracion',
  icono: 'Network',
  baja: 'inactivar',
  campos: {
    codigo: texto({ requerido: true, unico: true, largoMaximo: 12, etiqueta: 'Código interno' }),
    nombre: texto({ requerido: true, unico: true, largoMaximo: 120 }),
    localidad: referencia('Localidad'),
  },
});
