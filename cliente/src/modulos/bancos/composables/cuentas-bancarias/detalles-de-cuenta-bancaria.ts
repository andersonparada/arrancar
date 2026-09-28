import { formatearOpcion, formatearTexto } from '@/modulos/core/utilidades/formato';
import { OPCIONES_DE_TIPO } from './edicion-de-cuenta-bancaria';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { CuentaBancaria } from '../../servicios/cuentas-bancarias.api';

/** Lo que muestra la tarjeta de la cuenta bancaria además de nombre corto, ya con formato. */
export const detallesDeCuentaBancaria = (registro: CuentaBancaria): DetalleDeRegistro[] => [
  { etiqueta: 'Banco', valor: formatearTexto(registro.bancoNombre) },
  { etiqueta: 'Número de cuenta', valor: formatearTexto(registro.numero) },
  { etiqueta: 'Tipo', valor: formatearOpcion(OPCIONES_DE_TIPO, registro.tipo) },
  { etiqueta: 'Observaciones', valor: formatearTexto(registro.observaciones) },
];
