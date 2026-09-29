import { formatearTexto } from '@/modulos/core/utilidades/formato';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Localidad } from '../../servicios/localidades.api';

/** Lo que muestra la tarjeta de la localidad además de nombre, ya con formato. */
export const detallesDeLocalidad = (registro: Localidad): DetalleDeRegistro[] => [
  { etiqueta: 'Código interno', valor: formatearTexto(registro.codigo) },
  { etiqueta: 'Tipo', valor: formatearTexto(registro.tipoNombre) },
  { etiqueta: 'Código de establecimiento SAT', valor: formatearTexto(registro.codigoEstablecimientoSat) },
  { etiqueta: 'Nombre comercial SAT', valor: formatearTexto(registro.nombreComercialSat) },
  { etiqueta: 'Departamento', valor: formatearTexto(registro.departamentoCodigo) },
  { etiqueta: 'Municipio', valor: formatearTexto(registro.municipioCodigo) },
  { etiqueta: 'Direccion', valor: formatearTexto(registro.direccion) },
];
