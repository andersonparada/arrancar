import type { EstadoDeDocumento, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';
import type { EstadoDeLaCarga } from '../puertos/puertos-de-saldos-iniciales.js';

/** Lo que llega para cargar o corregir un saldo inicial; el dinero va como texto en quetzales. */
export interface SolicitudDeSaldoInicial {
  proveedorId: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  /** `AAAA-MM-DD`. */
  fechaEmision: string;
  /** `null` = la propuesta de siempre; prohibido en una nota de crédito. */
  vencimiento: string | null;
  total: string;
  /** Todas las retenciones del documento; sin dato, cero. */
  retenciones?: string;
  /** La parte de las retenciones que la empresa todavía no practicó; sin dato, cero. */
  retencionesPorPracticar?: string;
  /** Lo que falta pagarle al proveedor al corte, sin retenciones. */
  saldoPendiente: string;
  referencia: string | null;
  tieneActivoFijo?: boolean;
}

/** Un saldo inicial tal como lo ve la ventana de Administración. El dinero va como texto con dos decimales. */
export interface SaldoInicialDto {
  id: string;
  proveedorId: string;
  proveedorNombre: string;
  proveedorNit: string | null;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  referencia: string | null;
  fechaEmision: string;
  vencimiento: string | null;
  total: string;
  retenciones: string;
  retencionesPorPracticar: string;
  /** Lo que faltaba pagar en la fecha de inicio. */
  saldoPendiente: string;
  /** Pagos y notas anteriores a la fecha de inicio (derivado). */
  anterioresAlInicio: string;
  /** Lo que se debe hoy, tras notas y pagos. */
  saldo: string;
  estado: EstadoDeDocumento;
  tieneActivoFijo: boolean;
  creadoEn: string;
  /** Carga abierta, completado (no autorizado) y sin movimientos; el permiso lo mira el cliente. */
  puedeCorregir: boolean;
  puedeEliminar: boolean;
}

export interface PaginaDeSaldosInicialesDto {
  carga: EstadoDeLaCarga;
  elementos: SaldoInicialDto[];
  total: number;
  pagina: number;
  limite: number;
}
