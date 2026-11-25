import { formatearOpcion } from '@/modulos/core/utilidades/formato';
import { OPCIONES_DE_TIPO } from './edicion-de-concepto-de-ingreso';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { ConceptoDeIngreso } from '../../servicios/conceptos-de-ingreso.api';

/** Lo que muestra la tarjeta del concepto de ingreso además de nombre, ya con formato. */
export const detallesDeConceptoDeIngreso = (registro: ConceptoDeIngreso): DetalleDeRegistro[] => [
  { etiqueta: 'Tipo', valor: formatearOpcion(OPCIONES_DE_TIPO, registro.tipo) },
];
