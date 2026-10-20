import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type {
  ActivoFijoComprado,
  CombustibleDelMes,
  CompraDeConcepto,
  CompraDeProveedor,
  DocumentoDeLinea,
  IvaAlCostoDeLinea,
} from '../../dominio/analisis/filas-del-analisis.js';
import type { MotivoSinCredito, TipoDte } from '../../dominio/tipos-de-documento.js';

/** Lo que leen las consultas de análisis; el dinero llega como texto de `numeric`. */
export interface FilaDeProveedor {
  proveedorId: string;
  nit: string | null;
  nombre: string;
  documentos: number;
  total: string;
  base: string;
  ivaConCredito: string;
  ivaSinCredito: string;
  exentoYNoAfecto: string;
  idp: string;
  retenido: string;
}

export interface FilaDeConcepto {
  conceptoId: string;
  concepto: string;
  tipo: 'bien' | 'servicio';
  lineas: number;
  base: string;
  ivaConCredito: string;
  ivaAlCosto: string;
  costo: string;
}

export interface FilaDeLinea {
  documentoId: string;
  periodo: string;
  fecha: string;
  tipoDte: TipoDte | null;
  serie: string | null;
  numero: string;
  nit: string | null;
  proveedor: string;
  numeroDeLinea: number;
  concepto: string;
  descripcion: string | null;
  motivo: string | null;
  ivaAlCosto: string;
  costo: string;
  ivaConCredito: string;
}

export interface FilaDeCombustible {
  combustible: string | null;
  periodo: string;
  galones: string | number;
  idp: string;
  base: string;
  iva: string;
  exentoYNoAfecto: string;
  exentoPorDecreto: boolean;
  lineasConIdpSinGalones: number;
}

export function compraDeProveedor(fila: FilaDeProveedor): CompraDeProveedor {
  const total = aCentavos(fila.total);
  const retenido = aCentavos(fila.retenido);
  return {
    proveedorId: fila.proveedorId,
    nit: fila.nit,
    nombre: fila.nombre,
    documentos: Number(fila.documentos),
    total,
    base: aCentavos(fila.base),
    ivaConCredito: aCentavos(fila.ivaConCredito),
    ivaSinCredito: aCentavos(fila.ivaSinCredito),
    exentoYNoAfecto: aCentavos(fila.exentoYNoAfecto),
    idp: aCentavos(fila.idp),
    retenido,
    neto: total - retenido,
  };
}

export const compraDeConcepto = (fila: FilaDeConcepto): CompraDeConcepto => ({
  conceptoId: fila.conceptoId,
  concepto: fila.concepto,
  tipo: fila.tipo,
  lineas: Number(fila.lineas),
  base: aCentavos(fila.base),
  ivaConCredito: aCentavos(fila.ivaConCredito),
  ivaAlCosto: aCentavos(fila.ivaAlCosto),
  costo: aCentavos(fila.costo),
});

const documentoDeLinea = (fila: FilaDeLinea): DocumentoDeLinea => ({
  documentoId: fila.documentoId,
  periodo: fila.periodo,
  fecha: fila.fecha,
  tipoDte: fila.tipoDte,
  serie: fila.serie,
  numero: fila.numero,
  nitDelProveedor: fila.nit,
  proveedor: fila.proveedor,
});

export const ivaAlCostoDeLinea = (fila: FilaDeLinea): IvaAlCostoDeLinea => ({
  ...documentoDeLinea(fila),
  motivo: fila.motivo as MotivoSinCredito | null,
  numeroDeLinea: fila.numeroDeLinea,
  concepto: fila.concepto,
  ivaAlCosto: aCentavos(fila.ivaAlCosto),
});

export const activoFijoComprado = (fila: FilaDeLinea): ActivoFijoComprado => ({
  ...documentoDeLinea(fila),
  numeroDeLinea: fila.numeroDeLinea,
  concepto: fila.concepto,
  descripcion: fila.descripcion,
  costo: aCentavos(fila.costo),
  ivaConCredito: aCentavos(fila.ivaConCredito),
});

export const combustibleDelMes = (fila: FilaDeCombustible): CombustibleDelMes => ({
  combustible: fila.combustible,
  periodo: fila.periodo,
  galones: Number(fila.galones),
  idp: aCentavos(fila.idp),
  base: aCentavos(fila.base),
  iva: aCentavos(fila.iva),
  exentoYNoAfecto: aCentavos(fila.exentoYNoAfecto),
  exentoPorDecreto: fila.exentoPorDecreto,
  lineasConIdpSinGalones: Number(fila.lineasConIdpSinGalones),
});
