import type {
  ActivoFijoComprado,
  CombustibleDelMes,
  CompraDeConcepto,
  CompraDeProveedor,
  IvaAlCostoDeLinea,
} from '../../dominio/analisis/filas-del-analisis.js';
import type { RangoDePeriodos } from '../../dominio/analisis/rango-de-periodos.js';

/**
 * Los análisis de compras: documentos vigentes de la empresa en un rango de períodos, con las notas de crédito
 * restando. Corren en la transacción de la empresa activa (RLS).
 */
export interface ConsultasDeAnalisis {
  /** Una fila por proveedor; con `incluirFueraDelLibro` entran también los documentos que no van en reportes SAT. */
  comprasPorProveedor(
    empresaId: string,
    rango: RangoDePeriodos,
    opciones: { incluirFueraDelLibro: boolean },
  ): Promise<CompraDeProveedor[]>;
  /** Una fila por concepto de gasto y tipo de línea (bien o servicio). */
  comprasPorConcepto(empresaId: string, rango: RangoDePeriodos): Promise<CompraDeConcepto[]>;
  /** Las líneas con IVA al costo, ordenadas por motivo, período y documento. */
  ivaAlCosto(empresaId: string, rango: RangoDePeriodos): Promise<IvaAlCostoDeLinea[]>;
  /** Las líneas de activo fijo, por fecha de emisión. */
  activosFijos(empresaId: string, rango: RangoDePeriodos): Promise<ActivoFijoComprado[]>;
  /** Una fila por combustible y mes, ordenadas por combustible y período. */
  combustibles(empresaId: string, rango: RangoDePeriodos): Promise<CombustibleDelMes[]>;
}
