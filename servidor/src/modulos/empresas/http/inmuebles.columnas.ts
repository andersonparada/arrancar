import type { Columna, OpcionDeReferencia } from '../../core/intercambio/aplicacion/columnas.js';
import { columnasDeValoresDeInmueble } from './inmuebles.valores.columnas.js';

type OpcionesDeReferencias = Record<'localidadId', () => Promise<OpcionDeReferencia[]>>;

const columnasDelRegistro: Columna[] = [
  { clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' },
  {
    clave: 'situacionRegistral',
    titulo: 'Situación registral',
    requerido: true,
    tipo: 'lista',
    opciones: { inscrito: 'Inscrito en el registro', posesorio: 'Posesorio (sin inscribir)' },
  },
  {
    clave: 'registro',
    titulo: 'Registro',
    requerido: false,
    tipo: 'lista',
    opciones: { general: 'Registro General de la Propiedad', segundo: 'Segundo Registro (Quetzaltenango)' },
  },
  { clave: 'numeroDeFinca', titulo: 'Número de finca', requerido: false, tipo: 'texto' },
  { clave: 'folio', titulo: 'Folio', requerido: false, tipo: 'texto' },
  { clave: 'libro', titulo: 'Libro', requerido: false, tipo: 'texto' },
  { clave: 'departamentoRegistral', titulo: 'Departamento del libro', requerido: false, tipo: 'texto' },
  { clave: 'documentoPosesorio', titulo: 'Documento de derechos posesorios', requerido: false, tipo: 'texto' },
  { clave: 'titulacionSupletoriaEnTramite', titulo: 'Titulación supletoria en trámite', requerido: true, tipo: 'siNo' },
];

const columnasDeLaTitularidad: Columna[] = [
  {
    clave: 'titularidad',
    titulo: 'Titularidad',
    requerido: true,
    tipo: 'lista',
    opciones: { propia: 'Propia', copropiedad: 'Copropiedad', de_tercero: 'De un tercero' },
  },
  { clave: 'porcentajeDeCopropiedad', titulo: 'Porcentaje de copropiedad', requerido: false, tipo: 'decimal' },
  { clave: 'titular', titulo: 'Titular registral', requerido: false, tipo: 'texto' },
  { clave: 'matriculaFiscal', titulo: 'Matrícula fiscal', requerido: false, tipo: 'texto' },
  {
    clave: 'administraIusi',
    titulo: 'Quién administra el IUSI',
    requerido: false,
    tipo: 'lista',
    opciones: { dicabi: 'DICABI', municipalidad: 'Municipalidad' },
  },
  { clave: 'codigoCatastral', titulo: 'Código catastral', requerido: false, tipo: 'texto' },
];

const columnasDeLaUbicacion: Columna[] = [
  { clave: 'departamentoCodigo', titulo: 'Departamento', requerido: false, tipo: 'texto' },
  { clave: 'municipioCodigo', titulo: 'Municipio', requerido: false, tipo: 'texto' },
  { clave: 'direccion', titulo: 'Dirección', requerido: false, tipo: 'texto' },
];

const columnasDeLaEscritura: Columna[] = [
  { clave: 'superficieRegistralM2', titulo: 'Superficie registral (m²)', requerido: false, tipo: 'decimal' },
  { clave: 'cantidadOriginal', titulo: 'Cantidad de la escritura', requerido: false, tipo: 'decimal' },
  {
    clave: 'unidadOriginal',
    titulo: 'Unidad de la escritura',
    requerido: false,
    tipo: 'lista',
    opciones: {
      m2: 'Metros cuadrados',
      hectarea: 'Hectáreas',
      manzana: 'Manzanas',
      cuerda: 'Cuerdas',
      vara_cuadrada: 'Varas cuadradas',
      caballeria: 'Caballerías',
    },
  },
  { clave: 'varasPorLadoDeCuerda', titulo: 'Varas por lado de la cuerda', requerido: false, tipo: 'entero' },
];

const columnasDeLaLocalidad = (opciones: OpcionesDeReferencias): Columna[] => [
  {
    clave: 'localidadId',
    titulo: 'Localidad',
    requerido: false,
    tipo: 'referencia',
    campoDeNombre: 'localidadNombre',
    opciones: opciones.localidadId,
  },
  { clave: 'observaciones', titulo: 'Observaciones', requerido: false, tipo: 'texto' },
];

/** Las columnas del Excel de los inmuebles: los mismos datos del formulario, en el mismo orden, y al final el valor vigente de cada fuente. */
export const columnasDeInmuebles = (opciones: OpcionesDeReferencias): Columna[] => [
  ...columnasDelRegistro,
  ...columnasDeLaTitularidad,
  ...columnasDeLaUbicacion,
  ...columnasDeLaEscritura,
  ...columnasDeLaLocalidad(opciones),
  ...columnasDeValoresDeInmueble,
];
