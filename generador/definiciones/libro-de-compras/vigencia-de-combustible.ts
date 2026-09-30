import { decimal, definirRecurso, fecha, referencia } from '../../src/definicion/indice.js';

/**
 * Vigencia de la tasa de IDP de un combustible (L2-3 del diseño de datos): desde cuándo rige cada tasa.
 * Una vigencia nueva cierra la abierta el día anterior; no se traslapan (lo garantiza la base). Solo se
 * elimina si ningún documento la usa. Genere su código con:
 *   npm run generar -- recurso libro-de-compras/vigencia-de-combustible
 */
export const recurso = definirRecurso({
  modulo: 'libro-de-compras',
  entidad: 'VigenciaDeCombustible',
  plural: 'VigenciasDeCombustible',
  textos: { singular: 'vigencia de combustible', plural: 'vigencias de combustible' },
  genero: 'femenino',
  alcance: 'empresa',
  pantalla: 'catalogo',
  seccion: 'administracion',
  icono: 'CalendarRange',
  baja: 'eliminar',
  mostrar: 'vigenteDesde',
  campos: {
    combustible: referencia('Combustible', { requerido: true }),
    idpPorGalon: decimal({ requerido: true, etiqueta: 'IDP por galón (Q)' }),
    porcentajeDeEtanol: decimal({ requerido: true, etiqueta: 'Porcentaje de etanol' }),
    vigenteDesde: fecha({ requerido: true, etiqueta: 'Vigente desde' }),
    vigenteHasta: fecha({ etiqueta: 'Vigente hasta' }),
  },
});
