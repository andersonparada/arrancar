import { definirRecurso, texto, textoLargo, referencia, lista } from '../../src/definicion/indice.js';

/**
 * Cuenta bancaria del módulo bancos. Complete los campos y genere su código con:
 *   npm run generar -- recurso bancos/cuenta-bancaria
 *
 * Tipos de campo: texto, textoLargo, entero, decimal, dinero, fecha, siNo, lista,
 * correo, telefono, nit y dpi (se importan de ../../src/definicion/indice.js).
 * Revise el plural, los textos con tildes y el género: salen en las pantallas.
 */
export const recurso = definirRecurso({
  modulo: 'bancos',
  entidad: 'CuentaBancaria',
  plural: 'CuentasBancarias',
  textos: { singular: 'cuenta bancaria', plural: 'cuentas bancarias' },
  genero: 'femenino',
  alcance: 'empresa',
  pantalla: 'completa',
  baja: 'inactivar',
  campos: {
    nombre: texto({ requerido: true, unico: true, etiqueta: 'Nombre corto' }),
    banco: referencia('Banco', { requerido: true }),
    numero: texto({ requerido: true, unico: true, etiqueta: 'Número de cuenta' }),
    tipo: lista({ monetaria: 'Monetaria', ahorro: 'De ahorro' }, { requerido: true }),
    observaciones: textoLargo(),
  },
});
