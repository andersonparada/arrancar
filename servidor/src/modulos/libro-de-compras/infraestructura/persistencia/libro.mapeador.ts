import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type {
  AnuladoDelLibro,
  CategoriaDeLinea,
  CategoriaDelDocumento,
  DocumentoDelLibro,
} from '../../dominio/libro/documento-del-libro.js';
import type { MotivoSinCredito } from '../../dominio/tipos-de-documento.js';
import type { documentos } from './documentos.tablas.js';

type FilaDeDocumento = typeof documentos.$inferSelect;

/** Una fila de la consulta del libro: el documento y una categoría de sus líneas, sumada. */
export interface FilaDeCategoria {
  documento: FilaDeDocumento;
  nit: string | null;
  categoria: CategoriaDeLinea;
  base: string;
  iva: string;
  ivaNoAcreditable: string;
  exentoYNoAfecto: string;
  combustibleExento: boolean;
}

export interface FilaDeAnulado {
  documento: FilaDeDocumento;
  nit: string | null;
  nombres: string | null;
  apellidos: string | null;
}

function categoriaDe(fila: FilaDeCategoria): CategoriaDelDocumento {
  return {
    categoria: fila.categoria,
    base: aCentavos(fila.base),
    iva: aCentavos(fila.iva),
    ivaNoAcreditable: aCentavos(fila.ivaNoAcreditable),
    exentoYNoAfecto: aCentavos(fila.exentoYNoAfecto),
    combustibleExento: fila.combustibleExento,
  };
}

function documentoDe(fila: FilaDeCategoria): DocumentoDelLibro {
  const d = fila.documento;
  return {
    id: d.id,
    tipo: d.tipo,
    tipoDte: d.tipoDte,
    fechaEmision: d.fechaEmision,
    serie: d.serie,
    numero: d.numero,
    nitDelProveedor: fila.nit,
    nombreDelProveedor: d.nombreEmisor,
    proveedorId: d.proveedorId,
    motivoSinCredito: d.motivoSinCredito as MotivoSinCredito | null,
    regimenIvaDeLaEmpresa: d.regimenIvaDeLaEmpresa,
    total: aCentavos(d.total),
    base: aCentavos(d.base),
    iva: aCentavos(d.iva),
    ivaNoAcreditable: aCentavos(d.ivaNoAcreditable),
    idp: aCentavos(d.idp),
    exento: aCentavos(d.exento),
    otrosImpuestos: aCentavos(d.otrosImpuestos),
    categorias: [],
  };
}

/** Junta las filas de un mismo documento (una por categoría) conservando el orden de la consulta. */
export function documentosDelLibro(filas: FilaDeCategoria[]): DocumentoDelLibro[] {
  const porDocumento = new Map<string, DocumentoDelLibro>();
  for (const fila of filas) {
    const documento = porDocumento.get(fila.documento.id) ?? documentoDe(fila);
    documento.categorias.push(categoriaDe(fila));
    porDocumento.set(documento.id, documento);
  }
  return [...porDocumento.values()];
}

export function anuladoDelLibro({ documento: d, nit, nombres, apellidos }: FilaDeAnulado): AnuladoDelLibro {
  return {
    id: d.id,
    tipoDte: d.tipoDte,
    fechaEmision: d.fechaEmision,
    serie: d.serie,
    numero: d.numero,
    nitDelProveedor: nit,
    nombreDelProveedor: d.nombreEmisor,
    total: aCentavos(d.total),
    iva: aCentavos(d.iva),
    causaDeAnulacion: d.causaDeAnulacion,
    motivoDeAnulacion: d.motivoDeAnulacion,
    anuladoEn: d.anuladoEn?.toISOString() ?? null,
    anuladoPor: nombres ? `${nombres} ${apellidos ?? ''}`.trim() : null,
  };
}
