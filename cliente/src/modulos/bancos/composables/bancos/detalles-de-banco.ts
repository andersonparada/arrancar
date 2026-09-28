import { formatearTexto } from '@/modulos/core/utilidades/formato';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Banco } from '../../servicios/bancos.api';

/** Lo que muestra la tarjeta del banco además de nombre, ya con formato. */
export const detallesDeBanco = (registro: Banco): DetalleDeRegistro[] => [
  { etiqueta: 'Observaciones', valor: formatearTexto(registro.observaciones) },
];
