import type { CategoriaDelDocumento, DocumentoDelLibro } from './documento-del-libro.js';

export const categoria = (cambios: Partial<CategoriaDelDocumento> = {}): CategoriaDelDocumento => ({
  categoria: 'bien',
  base: 100000,
  iva: 12000,
  ivaNoAcreditable: 0,
  exentoYNoAfecto: 0,
  combustibleExento: false,
  ...cambios,
});

/** Una factura de Q1,120.00 (base 1,000.00 e IVA 120.00) de un bien. */
export const documento = (cambios: Partial<DocumentoDelLibro> = {}): DocumentoDelLibro => ({
  id: 'doc',
  tipo: 'factura',
  tipoDte: 'FACT',
  fechaEmision: '2026-10-05',
  serie: 'A',
  numero: '1',
  nitDelProveedor: '5769370',
  nombreDelProveedor: 'Veterinaria El Quiroa',
  proveedorId: 'prov-1',
  motivoSinCredito: null,
  regimenIvaDeLaEmpresa: 'general',
  total: 112000,
  base: 100000,
  iva: 12000,
  ivaNoAcreditable: 0,
  idp: 0,
  exento: 0,
  otrosImpuestos: 0,
  categorias: [categoria()],
  ...cambios,
});
