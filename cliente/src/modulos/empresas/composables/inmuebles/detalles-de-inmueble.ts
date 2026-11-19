import { formatearCantidad, formatearOpcion, formatearSiNo, formatearTexto } from '@/modulos/core/utilidades/formato';
import {
  OPCIONES_DE_SITUACION_REGISTRAL,
  OPCIONES_DE_REGISTRO,
  OPCIONES_DE_TITULARIDAD,
  OPCIONES_DE_ADMINISTRA_IUSI,
  OPCIONES_DE_UNIDAD_ORIGINAL,
} from './edicion-de-inmueble';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Inmueble } from '../../servicios/inmuebles.api';
import { llaveDeMunicipio, type NombresDeUbicacion } from '../localidades/detalles-de-localidad';

/** Lo que muestra la tarjeta del inmueble en la lista: lo que lo identifica. */
export const resumenDeInmueble = (registro: Inmueble): DetalleDeRegistro[] => [
  {
    etiqueta: 'Situación registral',
    valor: formatearOpcion(OPCIONES_DE_SITUACION_REGISTRAL, registro.situacionRegistral),
  },
  { etiqueta: 'Finca, folio y libro', valor: formatearTexto(fincaFolioYLibro(registro)) },
  { etiqueta: 'Titularidad', valor: formatearOpcion(OPCIONES_DE_TITULARIDAD, registro.titularidad) },
  { etiqueta: 'Matrícula fiscal', valor: formatearTexto(registro.matriculaFiscal) },
  { etiqueta: 'Localidad', valor: formatearTexto(registro.localidadNombre) },
];

/** «1234 · 56 · 345E», o nada si no es inscrito. */
export const fincaFolioYLibro = ({ numeroDeFinca, folio, libro }: Inmueble): string | null =>
  numeroDeFinca && folio && libro ? `${numeroDeFinca} · ${folio} · ${libro}` : null;

const nombreDe = (nombres: Record<string, string>, codigo: string | null): string | null =>
  codigo && (nombres[codigo] ?? codigo);

const datosDelRegistro = (registro: Inmueble, nombres: NombresDeUbicacion): DetalleDeRegistro[] => [
  { etiqueta: 'Registro', valor: formatearOpcion(OPCIONES_DE_REGISTRO, registro.registro) },
  {
    etiqueta: 'Departamento del libro',
    valor: formatearTexto(nombreDe(nombres.departamentos, registro.departamentoRegistral)),
  },
  { etiqueta: 'Documento de derechos posesorios', valor: formatearTexto(registro.documentoPosesorio) },
  { etiqueta: 'Titulación supletoria en trámite', valor: formatearSiNo(registro.titulacionSupletoriaEnTramite) },
  { etiqueta: 'Porcentaje de copropiedad', valor: formatearCantidad(registro.porcentajeDeCopropiedad) },
  { etiqueta: 'Titular registral', valor: formatearTexto(registro.titular) },
  {
    etiqueta: 'Quién administra el IUSI',
    valor: formatearOpcion(OPCIONES_DE_ADMINISTRA_IUSI, registro.administraIusi),
  },
];

const datosDeLaUbicacion = (registro: Inmueble, nombres: NombresDeUbicacion): DetalleDeRegistro[] => [
  { etiqueta: 'Código catastral', valor: formatearTexto(registro.codigoCatastral) },
  { etiqueta: 'Departamento', valor: formatearTexto(nombreDe(nombres.departamentos, registro.departamentoCodigo)) },
  { etiqueta: 'Municipio', valor: formatearTexto(nombreDeMunicipio(registro, nombres)) },
  { etiqueta: 'Dirección', valor: formatearTexto(registro.direccion) },
  { etiqueta: 'Superficie registral (m²)', valor: formatearCantidad(registro.superficieRegistralM2) },
  { etiqueta: 'Cantidad de la escritura', valor: formatearCantidad(registro.cantidadOriginal) },
  { etiqueta: 'Unidad de la escritura', valor: formatearOpcion(OPCIONES_DE_UNIDAD_ORIGINAL, registro.unidadOriginal) },
  { etiqueta: 'Varas por lado de la cuerda', valor: formatearTexto(registro.varasPorLadoDeCuerda) },
  { etiqueta: 'Observaciones', valor: formatearTexto(registro.observaciones) },
];

/** Todos los datos del inmueble para su ficha, ya con formato. */
export const detallesDeInmueble = (
  registro: Inmueble,
  nombres: NombresDeUbicacion = { departamentos: {}, municipios: {} },
): DetalleDeRegistro[] => [
  ...resumenDeInmueble(registro),
  ...datosDelRegistro(registro, nombres),
  ...datosDeLaUbicacion(registro, nombres),
];

function nombreDeMunicipio(registro: Inmueble, nombres: NombresDeUbicacion): string | null {
  const { departamentoCodigo: departamento, municipioCodigo: municipio } = registro;
  if (!municipio) return null;
  return (departamento && nombres.municipios[llaveDeMunicipio(departamento, municipio)]) || municipio;
}
