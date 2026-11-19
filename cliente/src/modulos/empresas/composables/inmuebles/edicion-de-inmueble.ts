import { numeroONulo, textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosInmueble, Inmueble } from '../../servicios/inmuebles.api';

export const OPCIONES_DE_SITUACION_REGISTRAL = {
  inscrito: 'Inscrito en el registro',
  posesorio: 'Posesorio (sin inscribir)',
};

export const OPCIONES_DE_REGISTRO = {
  general: 'Registro General de la Propiedad',
  segundo: 'Segundo Registro (Quetzaltenango)',
};

export const OPCIONES_DE_TITULARIDAD = { propia: 'Propia', copropiedad: 'Copropiedad', de_tercero: 'De un tercero' };

export const OPCIONES_DE_ADMINISTRA_IUSI = { dicabi: 'DICABI', municipalidad: 'Municipalidad' };

export const OPCIONES_DE_UNIDAD_ORIGINAL = {
  m2: 'Metros cuadrados',
  hectarea: 'Hectáreas',
  manzana: 'Manzanas',
  cuerda: 'Cuerdas',
  vara_cuadrada: 'Varas cuadradas',
  caballeria: 'Caballerías',
};

/** Lo que muestra cada campo del formulario mientras se edita un inmueble. */
export interface EdicionDeInmueble {
  abierta: boolean;
  id: string | null;
  nombre: string;
  situacionRegistral: 'inscrito' | 'posesorio';
  registro: 'general' | 'segundo' | null;
  numeroDeFinca: string;
  folio: string;
  libro: string;
  departamentoRegistral: string | null;
  documentoPosesorio: string;
  titulacionSupletoriaEnTramite: boolean;
  titularidad: 'propia' | 'copropiedad' | 'de_tercero';
  porcentajeDeCopropiedad: string | number;
  titular: string;
  matriculaFiscal: string;
  administraIusi: 'dicabi' | 'municipalidad' | null;
  codigoCatastral: string;
  departamentoCodigo: string | null;
  municipioCodigo: string | null;
  direccion: string;
  superficieRegistralM2: string | number;
  cantidadOriginal: string | number;
  unidadOriginal: 'm2' | 'hectarea' | 'manzana' | 'cuerda' | 'vara_cuadrada' | 'caballeria' | null;
  varasPorLadoDeCuerda: string | number;
  localidadId: string | null;
  observaciones: string;
}

const INMUEBLE_NUEVO: Omit<EdicionDeInmueble, 'abierta' | 'id'> = {
  nombre: '',
  situacionRegistral: 'inscrito',
  registro: null,
  numeroDeFinca: '',
  folio: '',
  libro: '',
  departamentoRegistral: null,
  documentoPosesorio: '',
  titulacionSupletoriaEnTramite: false,
  titularidad: 'propia',
  porcentajeDeCopropiedad: '',
  titular: '',
  matriculaFiscal: '',
  administraIusi: null,
  codigoCatastral: '',
  departamentoCodigo: null,
  municipioCodigo: null,
  direccion: '',
  superficieRegistralM2: '',
  cantidadOriginal: '',
  unidadOriginal: null,
  varasPorLadoDeCuerda: '',
  localidadId: null,
  observaciones: '',
};

/** El formulario abierto con los datos del inmueble, o vacío si es nuevo. */
export function edicionDe(inmueble?: Inmueble): EdicionDeInmueble {
  if (!inmueble) return { abierta: true, id: null, ...INMUEBLE_NUEVO };
  const { id, activo, localidadNombre, ...datos } = inmueble;
  return {
    ...INMUEBLE_NUEVO,
    ...datos,
    abierta: true,
    id,
    numeroDeFinca: textoDeEdicion(datos.numeroDeFinca),
    folio: textoDeEdicion(datos.folio),
    libro: textoDeEdicion(datos.libro),
    documentoPosesorio: textoDeEdicion(datos.documentoPosesorio),
    porcentajeDeCopropiedad: textoDeEdicion(datos.porcentajeDeCopropiedad),
    titular: textoDeEdicion(datos.titular),
    matriculaFiscal: textoDeEdicion(datos.matriculaFiscal),
    codigoCatastral: textoDeEdicion(datos.codigoCatastral),
    direccion: textoDeEdicion(datos.direccion),
    superficieRegistralM2: textoDeEdicion(datos.superficieRegistralM2),
    cantidadOriginal: textoDeEdicion(datos.cantidadOriginal),
    varasPorLadoDeCuerda: textoDeEdicion(datos.varasPorLadoDeCuerda),
    observaciones: textoDeEdicion(datos.observaciones),
  };
}

/** Los datos del libro del registro, que solo tiene un inmueble inscrito. */
const datosDelLibro = (edicion: EdicionDeInmueble) =>
  edicion.situacionRegistral === 'inscrito'
    ? {
        registro: edicion.registro,
        numeroDeFinca: textoONulo(edicion.numeroDeFinca),
        folio: textoONulo(edicion.folio),
        libro: textoONulo(edicion.libro),
        departamentoRegistral: edicion.departamentoRegistral,
        documentoPosesorio: null,
        titulacionSupletoriaEnTramite: false,
      }
    : {
        registro: null,
        numeroDeFinca: null,
        folio: null,
        libro: null,
        departamentoRegistral: null,
        documentoPosesorio: textoONulo(edicion.documentoPosesorio),
        titulacionSupletoriaEnTramite: edicion.titulacionSupletoriaEnTramite,
      };

/** Lo que se manda al servidor: lo vacío como `null`, y solo los datos que aplican a lo elegido. */
export const datosDeInmueble = (edicion: EdicionDeInmueble): DatosInmueble => ({
  ...datosDelLibro(edicion),
  nombre: edicion.nombre,
  situacionRegistral: edicion.situacionRegistral,
  titularidad: edicion.titularidad,
  porcentajeDeCopropiedad: edicion.titularidad === 'copropiedad' ? textoONulo(edicion.porcentajeDeCopropiedad) : null,
  titular: textoONulo(edicion.titular),
  matriculaFiscal: textoONulo(edicion.matriculaFiscal),
  administraIusi: edicion.administraIusi,
  codigoCatastral: textoONulo(edicion.codigoCatastral),
  departamentoCodigo: edicion.departamentoCodigo,
  municipioCodigo: edicion.municipioCodigo,
  direccion: textoONulo(edicion.direccion),
  superficieRegistralM2: textoONulo(edicion.superficieRegistralM2),
  cantidadOriginal: textoONulo(edicion.cantidadOriginal),
  unidadOriginal: edicion.unidadOriginal,
  varasPorLadoDeCuerda: edicion.unidadOriginal === 'cuerda' ? numeroONulo(edicion.varasPorLadoDeCuerda) : null,
  localidadId: edicion.localidadId,
  observaciones: textoONulo(edicion.observaciones),
});

/** Lo que dice la confirmación de eliminar: sin uso se elimina; con uso, el servidor lo impide y se inactiva. */
export const mensajeDeEliminacion = (nombre: string): string =>
  `Se eliminará el inmueble «${nombre}». Si lo usan Parcelas o Activos fijos no se podrá eliminar; en ese caso inactívelo. Esta acción no se puede deshacer.`;
