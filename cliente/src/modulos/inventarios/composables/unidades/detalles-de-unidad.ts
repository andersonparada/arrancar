import { formatearOpcion, formatearTexto } from '@/modulos/core/utilidades/formato';
import { sinCerosFinales } from '../compartido/cantidades';
import { OPCIONES_DE_MAGNITUD } from './edicion-de-unidad';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Unidad } from '../../servicios/unidades.api';

/** Lo que muestra la tarjeta de la unidad de medida además de nombre, ya con formato. */
export const detallesDeUnidad = (registro: Unidad): DetalleDeRegistro[] => [
  { etiqueta: 'Símbolo', valor: formatearTexto(registro.simbolo) },
  { etiqueta: 'Magnitud', valor: formatearOpcion(OPCIONES_DE_MAGNITUD, registro.magnitud) },
  { etiqueta: 'Factor a la referencia', valor: formatearTexto(sinCerosFinales(registro.factorALaReferencia)) },
];
