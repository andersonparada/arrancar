import type { CampoComparado, ClaveDeResultado } from './servicios/conciliacion.api';

export const CONCILIACION = {
  pestana: 'Conciliación',
  descripcion:
    'Compara las facturas registradas de un mes con lo que la SAT dice que la empresa recibió, para encontrar lo que falta de cada lado.',
  periodo: 'Período',
  cargando: 'Calculando la conciliación…',
  sinDatos:
    'Todavía no se ha cargado ningún archivo de la SAT que toque este mes, así que no hay nada con qué comparar.',
  todoCuadra: 'Todo cuadra: lo registrado coincide con lo que la SAT informa.',
  porRevisar: 'Hay cosas por revisar. Toque una tarjeta para ver su detalle.',
  vacia: 'No hay nada en este grupo.',
  detalle: 'Detalle',
  arrancar: 'Arrancar',
  sat: 'SAT',
  otroPeriodo: 'Está registrada en el período',
  fueraDelLibro: 'Está fuera del libro',
} as const;

export interface TarjetaDeConciliacion {
  clave: ClaveDeResultado;
  texto: string;
  /** Qué significa y qué hacer, para quien llega sin saberlo. */
  explicacion: string;
  tono: 'campo' | 'trigo' | 'rojo' | 'tierra';
  /** Los de este grupo piden que alguien los revise. */
  porRevisar: boolean;
}

/** Las tarjetas, en el orden en que se trabajan: primero lo que cuadra y luego lo que hay que corregir. */
export const TARJETAS_DE_CONCILIACION: TarjetaDeConciliacion[] = [
  {
    clave: 'cuadra',
    texto: 'Cuadra',
    explicacion: 'Registradas y coinciden con la SAT en todos sus datos.',
    tono: 'campo',
    porRevisar: false,
  },
  {
    clave: 'conDiferencias',
    texto: 'Con diferencias',
    explicacion: 'Están en los dos lados pero algún dato no coincide. Manda lo que dice la SAT.',
    tono: 'rojo',
    porRevisar: true,
  },
  {
    clave: 'enLaSatYNoEnArrancar',
    texto: 'En la SAT y no registradas',
    explicacion: 'La SAT dice que se recibieron y aquí no están. Regístrelas o descártelas.',
    tono: 'rojo',
    porRevisar: true,
  },
  {
    clave: 'enArrancarYNoEnLaSat',
    texto: 'Registradas y no en la SAT',
    explicacion: 'Revise la factura: puede ser un error de captura o una factura emitida a otro NIT.',
    tono: 'rojo',
    porRevisar: true,
  },
  {
    clave: 'anuladoEnLaSatYVigenteAqui',
    texto: 'Anuladas en la SAT',
    explicacion: 'El emisor las anuló en la SAT y aquí siguen vigentes. Anule el registro.',
    tono: 'rojo',
    porRevisar: true,
  },
  {
    clave: 'sinDatosDeLaSat',
    texto: 'Sin datos de la SAT',
    explicacion: 'Registradas de un mes del que no se ha cargado el archivo de la SAT. No se pueden comparar.',
    tono: 'trigo',
    porRevisar: false,
  },
  {
    clave: 'registradoEnOtroPeriodo',
    texto: 'En otro período',
    explicacion: 'Emitidas en este mes pero registradas en otro período. Solo para que lo sepa.',
    tono: 'tierra',
    porRevisar: false,
  },
  {
    clave: 'noVaEnElLibro',
    texto: 'No va en el libro',
    explicacion:
      'Emitidas en este mes pero su documento está fuera del libro (por ejemplo, un recibo por donación). No hay nada que corregir.',
    tono: 'tierra',
    porRevisar: false,
  },
  {
    clave: 'descartado',
    texto: 'Descartadas',
    explicacion: 'Emitidas en este mes y descartadas a propósito. Puede restaurarlas si fue un error.',
    tono: 'tierra',
    porRevisar: false,
  },
];

export const CAMPOS_COMPARADOS: Record<CampoComparado, string> = {
  autorizacionFel: 'Autorización',
  tipoDte: 'Tipo de documento',
  nitEmisor: 'NIT del emisor',
  serie: 'Serie',
  numero: 'Número',
  fechaEmision: 'Fecha de emisión',
  total: 'Total',
  iva: 'IVA',
  idp: 'IDP',
  otrosImpuestos: 'Otros impuestos',
};

export const ACCIONES_DE_CONCILIACION = {
  abrirDocumento: 'Abrir factura',
  verEnLaBandeja: 'Registrar',
  registrarAqui: 'Registrar aquí',
  descartar: 'Descartar',
  restaurar: 'Restaurar',
} as const;

export type AccionDeConciliacion = keyof typeof ACCIONES_DE_CONCILIACION;
