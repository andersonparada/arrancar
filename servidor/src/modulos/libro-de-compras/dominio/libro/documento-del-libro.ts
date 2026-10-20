import type { RegimenDeIva } from '../datos-fiscales-de-empresa.js';
import type { MotivoSinCredito, TipoDeDocumento, TipoDte } from '../tipos-de-documento.js';

/** La categoría con que el libro agrupa las líneas de un documento. */
export const CATEGORIAS_DE_LINEA = ['bien', 'servicio', 'combustible', 'activo_fijo'] as const;
export type CategoriaDeLinea = (typeof CATEGORIAS_DE_LINEA)[number];

/** Las líneas de un documento de una misma categoría, sumadas. Montos en centavos, sin signo. */
export interface CategoriaDelDocumento {
  categoria: CategoriaDeLinea;
  base: number;
  iva: number;
  ivaNoAcreditable: number;
  /** Exento más otros impuestos de las líneas. */
  exentoYNoAfecto: number;
  /** La vigencia del combustible está exenta de IVA por el Decreto 22-2026. */
  combustibleExento: boolean;
}

/** Un documento vigente del período tal como está guardado (sin signo, en centavos), con sus categorías. */
export interface DocumentoDelLibro {
  id: string;
  tipo: TipoDeDocumento;
  tipoDte: TipoDte | null;
  fechaEmision: string;
  serie: string | null;
  numero: string;
  /** En la factura especial, el NIT o CUI del vendedor. */
  nitDelProveedor: string | null;
  nombreDelProveedor: string;
  proveedorId: string;
  motivoSinCredito: MotivoSinCredito | null;
  regimenIvaDeLaEmpresa: RegimenDeIva;
  total: number;
  base: number;
  iva: number;
  ivaNoAcreditable: number;
  idp: number;
  exento: number;
  otrosImpuestos: number;
  categorias: CategoriaDelDocumento[];
}

/** Un documento anulado del período, para el anexo. Los montos van positivos: no suman al libro. */
export interface AnuladoDelLibro {
  id: string;
  tipoDte: TipoDte | null;
  fechaEmision: string;
  serie: string | null;
  numero: string;
  nitDelProveedor: string | null;
  nombreDelProveedor: string;
  total: number;
  iva: number;
  causaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
  anuladoEn: string | null;
  anuladoPor: string | null;
}
