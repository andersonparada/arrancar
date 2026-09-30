import { formatearCantidad, formatearFecha, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { VigenciaDeCombustible } from '../../servicios/vigencias-de-combustible.api';

/** Lo que muestra la tarjeta de la vigencia de combustible además de vigente desde, ya con formato. */
export const detallesDeVigenciaDeCombustible = (registro: VigenciaDeCombustible): DetalleDeRegistro[] => [
  { etiqueta: 'Combustible', valor: formatearTexto(registro.combustibleNombre) },
  { etiqueta: 'IDP por galón (Q)', valor: formatearCantidad(registro.idpPorGalon) },
  { etiqueta: 'Porcentaje de etanol', valor: formatearCantidad(registro.porcentajeDeEtanol) },
  { etiqueta: 'Vigente hasta', valor: formatearFecha(registro.vigenteHasta) },
];
