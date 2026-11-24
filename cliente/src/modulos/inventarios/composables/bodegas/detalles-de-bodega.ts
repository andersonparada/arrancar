import { formatearTexto } from '@/modulos/core/utilidades/formato';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Bodega } from '../../servicios/bodegas.api';

/** Lo que muestra la tarjeta y la ficha de la bodega además de su código, ya con formato. */
export const detallesDeBodega = (registro: Bodega): DetalleDeRegistro[] => [
  { etiqueta: 'Nombre', valor: formatearTexto(registro.nombre) },
  { etiqueta: 'Localidad', valor: formatearTexto(registro.localidadNombre) },
  { etiqueta: 'Responsable', valor: formatearTexto(registro.responsable) },
];
