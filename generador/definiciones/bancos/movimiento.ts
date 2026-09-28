import {
  definirRecurso,
  texto,
  textoLargo,
  dinero,
  fecha,
  siNo,
  lista,
  referencia,
} from '../../src/definicion/indice.js';

/**
 * Movimiento del módulo bancos. Complete los campos y genere su código con:
 *   npm run generar -- recurso bancos/movimiento
 *
 * Tipos de campo: texto, textoLargo, entero, decimal, dinero, fecha, siNo, lista,
 * correo, telefono, nit y dpi (se importan de ../../src/definicion/indice.js).
 * Revise el plural, los textos con tildes y el género: salen en las pantallas.
 */
export const recurso = definirRecurso({
  modulo: 'bancos',
  entidad: 'Movimiento',
  plural: 'Movimientos',
  textos: { singular: 'movimiento', plural: 'movimientos' },
  genero: 'masculino',
  alcance: 'empresa',
  pantalla: 'catalogo',
  seccion: 'operacion',
  icono: 'ArrowLeftRight',
  baja: 'eliminar',
  mostrar: 'referencia',
  campos: {
    cuentaBancaria: referencia('CuentaBancaria', { requerido: true, etiqueta: 'Cuenta' }),
    tipo: lista({ credito: 'Nota de crédito', debito: 'Nota de débito' }, { requerido: true }),
    fecha: fecha({ requerido: true }),
    monto: dinero({ requerido: true }),
    saldoInicial: siNo({ etiqueta: 'Saldo inicial' }),
    referencia: texto({ etiqueta: 'Referencia' }),
    beneficiario: texto({ etiqueta: 'Beneficiario u origen' }),
    observaciones: textoLargo(),
  },
});
