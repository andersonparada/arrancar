import type { Columna, OpcionDeReferencia } from '../../core/intercambio/aplicacion/columnas.js';

type OpcionesDeReferencias = Record<'localidadId' | 'tipoId', () => Promise<OpcionDeReferencia[]>>;

const TENENCIAS = {
  propia: 'Propia',
  posesion: 'Posesión (sin inscribir)',
  copropiedad: 'Copropiedad',
  arrendada: 'Arrendada',
  usufructo: 'Usufructo',
  comodato: 'Comodato',
  aparceria: 'Aparcería',
  otra: 'Otra',
};

const UNIDADES = {
  m2: 'Metros cuadrados',
  hectarea: 'Hectáreas',
  manzana: 'Manzanas',
  cuerda: 'Cuerdas',
  vara_cuadrada: 'Varas cuadradas',
  caballeria: 'Caballerías',
};

const FUENTES = {
  escritura: 'Escritura',
  plano_topografico: 'Plano topográfico',
  gps: 'GPS',
  estimacion: 'Estimación',
  otra: 'Otra',
};

const columnasDeLaParcela = (opciones: OpcionesDeReferencias): Columna[] => [
  {
    clave: 'localidadId',
    titulo: 'Localidad',
    requerido: true,
    tipo: 'referencia',
    campoDeNombre: 'localidadNombre',
    opciones: opciones.localidadId,
  },
  { clave: 'codigo', titulo: 'Código', requerido: true, tipo: 'texto' },
  { clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' },
  {
    clave: 'tipoId',
    titulo: 'Tipo',
    requerido: true,
    tipo: 'referencia',
    campoDeNombre: 'tipoNombre',
    opciones: opciones.tipoId,
  },
  { clave: 'formaDeTenencia', titulo: 'Tenencia', requerido: true, tipo: 'lista', opciones: TENENCIAS },
  { clave: 'parcelaMadreCodigo', titulo: 'Código de la parcela madre', requerido: false, tipo: 'texto' },
];

const columnasDeLaMedicion: Columna[] = [
  { clave: 'cantidadOriginal', titulo: 'Superficie', requerido: false, tipo: 'decimal' },
  { clave: 'unidadOriginal', titulo: 'Unidad de la superficie', requerido: false, tipo: 'lista', opciones: UNIDADES },
  { clave: 'cantidadUtil', titulo: 'Superficie útil (misma unidad)', requerido: false, tipo: 'decimal' },
  { clave: 'fuente', titulo: 'Fuente de la medición', requerido: false, tipo: 'lista', opciones: FUENTES },
  { clave: 'vigenteDesde', titulo: 'Fecha de la medición', requerido: false, tipo: 'fecha' },
];

const columnasDelPuntoYLosLados: Columna[] = [
  { clave: 'latitud', titulo: 'Latitud', requerido: false, tipo: 'decimal' },
  { clave: 'longitud', titulo: 'Longitud', requerido: false, tipo: 'decimal' },
  { clave: 'colindanciaNorte', titulo: 'Colindancia norte', requerido: false, tipo: 'texto' },
  { clave: 'colindanciaSur', titulo: 'Colindancia sur', requerido: false, tipo: 'texto' },
  { clave: 'colindanciaOriente', titulo: 'Colindancia oriente', requerido: false, tipo: 'texto' },
  { clave: 'colindanciaPoniente', titulo: 'Colindancia poniente', requerido: false, tipo: 'texto' },
  { clave: 'inmuebles', titulo: 'Inmuebles (separados con «;»)', requerido: false, tipo: 'texto' },
  { clave: 'observaciones', titulo: 'Observaciones', requerido: false, tipo: 'texto' },
];

/** Las columnas del Excel de las parcelas: los datos del formulario, la medición inicial y los inmuebles por nombre. */
export const columnasDeParcelas = (opciones: OpcionesDeReferencias): Columna[] => [
  ...columnasDeLaParcela(opciones),
  ...columnasDeLaMedicion,
  ...columnasDelPuntoYLosLados,
];
