import { formatearOpcion, formatearSiNo } from '@/modulos/core/utilidades/formato';
import { OPCIONES_DE_TIPO_POR_OMISION } from './edicion-de-concepto-de-gasto';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';

/** Lo que muestra la tarjeta del concepto de gasto además de nombre, ya con formato. */
export const detallesDeConceptoDeGasto = (registro: ConceptoDeGasto): DetalleDeRegistro[] => [
  { etiqueta: 'Tipo por omisión', valor: formatearOpcion(OPCIONES_DE_TIPO_POR_OMISION, registro.tipoPorOmision) },
  { etiqueta: 'Es producto agropecuario', valor: formatearSiNo(registro.esProductoAgropecuario) },
  { etiqueta: 'Es activo fijo', valor: formatearSiNo(registro.esActivoFijo) },
];
