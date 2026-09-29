import { formatearTexto } from '@/modulos/core/utilidades/formato';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Localidad } from '../../servicios/localidades.api';

/** Nombres de Guatemala por código: los departamentos y los municipios (`departamento/municipio`). */
export interface NombresDeUbicacion {
  departamentos: Record<string, string>;
  municipios: Record<string, string>;
}

/** Llave con la que se guarda el nombre de un municipio. */
export const llaveDeMunicipio = (departamentoCodigo: string, municipioCodigo: string): string =>
  `${departamentoCodigo}/${municipioCodigo}`;

const SIN_NOMBRES: NombresDeUbicacion = { departamentos: {}, municipios: {} };

/** El nombre del departamento de la localidad; si aún no se conoce, su código. */
export const nombreDeDepartamento = (registro: Localidad, nombres: NombresDeUbicacion): string | null =>
  registro.departamentoCodigo && (nombres.departamentos[registro.departamentoCodigo] ?? registro.departamentoCodigo);

/** El nombre del municipio de la localidad; si aún no se conoce, su código. */
export function nombreDeMunicipio(registro: Localidad, nombres: NombresDeUbicacion): string | null {
  const { departamentoCodigo: departamento, municipioCodigo: municipio } = registro;
  if (!municipio) return null;
  return (departamento && nombres.municipios[llaveDeMunicipio(departamento, municipio)]) || municipio;
}

/** Lo que muestra la tarjeta de la localidad además de nombre, ya con formato. */
export const detallesDeLocalidad = (
  registro: Localidad,
  nombres: NombresDeUbicacion = SIN_NOMBRES,
): DetalleDeRegistro[] => [
  { etiqueta: 'Código interno', valor: formatearTexto(registro.codigo) },
  { etiqueta: 'Tipo', valor: formatearTexto(registro.tipoNombre) },
  { etiqueta: 'Código de establecimiento SAT', valor: formatearTexto(registro.codigoEstablecimientoSat) },
  { etiqueta: 'Nombre comercial SAT', valor: formatearTexto(registro.nombreComercialSat) },
  { etiqueta: 'Departamento', valor: formatearTexto(nombreDeDepartamento(registro, nombres)) },
  { etiqueta: 'Municipio', valor: formatearTexto(nombreDeMunicipio(registro, nombres)) },
  { etiqueta: 'Dirección', valor: formatearTexto(registro.direccion) },
];
