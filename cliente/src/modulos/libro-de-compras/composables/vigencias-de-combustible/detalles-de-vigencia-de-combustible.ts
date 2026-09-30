import { formatearCantidad, formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { VigenciaDeCombustible } from '../../servicios/vigencias-de-combustible.api';

/** Los datos de una tasa en la historia del combustible, ya con formato. «Hasta» solo va si la tasa ya se cerró. */
export const detallesDeVigenciaDeCombustible = (registro: VigenciaDeCombustible): DetalleDeRegistro[] => [
  { etiqueta: 'IDP por galón', valor: formatearMonto(registro.idpPorGalon) },
  { etiqueta: 'Etanol', valor: formatearCantidad(registro.porcentajeDeEtanol, '%') },
  { etiqueta: 'Desde', valor: formatearFecha(registro.vigenteDesde) },
  ...(registro.vigenteHasta ? [{ etiqueta: 'Hasta', valor: formatearFecha(registro.vigenteHasta) }] : []),
];
