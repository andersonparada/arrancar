import type { MotivoSinCredito, TipoDte } from '../tipos-de-documento.js';
import type { CategoriaDelDocumento, CategoriaDeLinea, DocumentoDelLibro } from './documento-del-libro.js';
import { SIGLA_DEL_MOTIVO } from './motivos-del-libro.js';
import type { TipoDeLibro } from './tipo-de-libro.js';

/**
 * Las columnas de dinero de una fila, en centavos y con signo. En el libro simplificado solo se llenan bienes,
 * servicios, exento y no afecto, IDP, IVA informativo y total.
 */
export interface MontosDelLibro {
  bienes: number;
  servicios: number;
  combustibles: number;
  pequenoContribuyente: number;
  primarioPecuario: number;
  exentoYNoAfecto: number;
  idp: number;
  ivaConCredito: number;
  ivaSinCredito: number;
  /** Libro simplificado: el IVA que va al costo. */
  ivaInformativo: number;
  total: number;
  /** Para el resumen: el IVA de las líneas de combustible. */
  ivaDeCombustibles: number;
  /** Para el resumen: lo exento por el Decreto 22-2026 en combustibles. */
  combustibleExentoPorDecreto: number;
}

export type ColumnaDeDinero = keyof MontosDelLibro;

export const COLUMNAS_DE_DINERO: readonly ColumnaDeDinero[] = [
  'bienes',
  'servicios',
  'combustibles',
  'pequenoContribuyente',
  'primarioPecuario',
  'exentoYNoAfecto',
  'idp',
  'ivaConCredito',
  'ivaSinCredito',
  'ivaInformativo',
  'total',
  'ivaDeCombustibles',
  'combustibleExentoPorDecreto',
];

export interface FilaDelLibro extends MontosDelLibro {
  documentoId: string;
  proveedorId: string;
  /** Correlativo de la fila en el período, desde 1. */
  numeroDeFila: number;
  fecha: string;
  tipoDte: TipoDte | null;
  serie: string | null;
  numero: string;
  nit: string | null;
  nombre: string;
  motivo: MotivoSinCredito | null;
  /** El código corto del motivo; nulo en el libro simplificado. */
  siglaDelMotivo: string | null;
}

const basesDe = (categorias: CategoriaDelDocumento[], ...nombres: CategoriaDeLinea[]) =>
  categorias.filter((c) => nombres.includes(c.categoria)).reduce((suma, c) => suma + c.base, 0);

function datosDelResumen(
  d: DocumentoDelLibro,
): Pick<MontosDelLibro, 'ivaDeCombustibles' | 'combustibleExentoPorDecreto'> {
  const combustibles = d.categorias.filter((c) => c.categoria === 'combustible');
  return {
    ivaDeCombustibles: combustibles.reduce((suma, c) => suma + c.iva, 0),
    combustibleExentoPorDecreto: d.categorias
      .filter((c) => c.combustibleExento)
      .reduce((suma, c) => suma + c.exentoYNoAfecto, 0),
  };
}

/** Los dos regímenes sin IVA que tienen columna propia en el libro completo. */
function columnaSinIva(motivo: MotivoSinCredito | null): 'pequenoContribuyente' | 'primarioPecuario' | null {
  if (motivo === 'pequeno_contribuyente') return 'pequenoContribuyente';
  if (motivo === 'primario_pecuario' || motivo === 'contribuyente_agropecuario') return 'primarioPecuario';
  return null;
}

/** Libro completo: las columnas del crédito fiscal, y los regímenes sin IVA en su propia columna. */
function montosCompletos(d: DocumentoDelLibro): MontosDelLibro {
  const sinIva = columnaSinIva(d.motivoSinCredito);
  return {
    bienes: sinIva ? 0 : basesDe(d.categorias, 'bien', 'activo_fijo'),
    servicios: sinIva ? 0 : basesDe(d.categorias, 'servicio'),
    combustibles: sinIva ? 0 : basesDe(d.categorias, 'combustible'),
    pequenoContribuyente: sinIva === 'pequenoContribuyente' ? d.base : 0,
    primarioPecuario: sinIva === 'primarioPecuario' ? d.base : 0,
    exentoYNoAfecto: d.exento + d.otrosImpuestos,
    idp: d.idp,
    ivaConCredito: d.iva - d.ivaNoAcreditable,
    ivaSinCredito: d.ivaNoAcreditable,
    ivaInformativo: 0,
    total: d.total,
    ...datosDelResumen(d),
  };
}

/** Libro simplificado: bienes (con combustibles), servicios y el IVA informativo, que va al costo. */
function montosSimplificados(d: DocumentoDelLibro): MontosDelLibro {
  return {
    bienes: basesDe(d.categorias, 'bien', 'activo_fijo', 'combustible'),
    servicios: basesDe(d.categorias, 'servicio'),
    combustibles: 0,
    pequenoContribuyente: 0,
    primarioPecuario: 0,
    exentoYNoAfecto: d.exento + d.otrosImpuestos,
    idp: d.idp,
    ivaConCredito: 0,
    ivaSinCredito: 0,
    ivaInformativo: d.iva,
    total: d.total,
    ...datosDelResumen(d),
  };
}

/** La nota de crédito resta; todo lo demás, incluida la nota de débito, suma. */
const signoDe = (d: DocumentoDelLibro): 1 | -1 => (d.tipo === 'nota_de_credito' ? -1 : 1);

function conSigno(montos: MontosDelLibro, signo: 1 | -1): MontosDelLibro {
  const resultado = { ...montos };
  for (const columna of COLUMNAS_DE_DINERO) {
    resultado[columna] = signo === 1 || montos[columna] === 0 ? montos[columna] : -montos[columna];
  }
  return resultado;
}

/**
 * Reparte un documento en las columnas del libro y le pone el signo. `numeroDeFila` es su lugar en el período.
 * Función pura: no consulta nada.
 */
export function filaDelLibro(
  documento: DocumentoDelLibro,
  tipoDeLibro: TipoDeLibro,
  numeroDeFila: number,
): FilaDelLibro {
  const montos = tipoDeLibro === 'completo' ? montosCompletos(documento) : montosSimplificados(documento);
  const conMotivo = tipoDeLibro === 'completo' ? documento.motivoSinCredito : null;
  return {
    documentoId: documento.id,
    proveedorId: documento.proveedorId,
    numeroDeFila,
    fecha: documento.fechaEmision,
    tipoDte: documento.tipoDte,
    serie: documento.serie,
    numero: documento.numero,
    nit: documento.nitDelProveedor,
    nombre: documento.nombreDelProveedor,
    motivo: documento.motivoSinCredito,
    siglaDelMotivo: conMotivo ? SIGLA_DEL_MOTIVO[conMotivo] : null,
    ...conSigno(montos, signoDe(documento)),
  };
}
