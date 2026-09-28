import { definirRecurso, texto, textoLargo } from '../../src/definicion/indice.js';

/**
 * Banco del módulo bancos. Complete los campos y genere su código con:
 *   npm run generar -- recurso bancos/banco
 *
 * Tipos de campo: texto, textoLargo, entero, decimal, dinero, fecha, siNo, lista,
 * correo, telefono, nit y dpi (se importan de ../../src/definicion/indice.js).
 * Revise el plural, los textos con tildes y el género: salen en las pantallas.
 */
export const recurso = definirRecurso({
  modulo: 'bancos',
  entidad: 'Banco',
  plural: 'Bancos',
  textos: { singular: 'banco', plural: 'bancos' },
  genero: 'masculino',
  alcance: 'empresa',
  pantalla: 'catalogo',
  baja: 'inactivar',
  campos: {
    nombre: texto({ requerido: true, unico: true }),
    observaciones: textoLargo(),
  },
});
