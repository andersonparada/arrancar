import type { EstadoDePago } from '../../dominio/pagos.js';
import type { SaldoDeProveedor } from '../../dominio/saldos-por-nit.js';
import type { OrigenDeDocumento, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';
import type { PaginacionDeDocumentos } from './puertos-de-consultas.js';

/** Qué documentos entran según su autorización de hoy: todos, solo los autorizados o solo los que faltan por autorizar. */
export type FiltroDeAutorizacion = 'todos' | 'autorizados' | 'sin_autorizar';

/** Lo que fija un corte: la empresa, el día, la fecha de inicio (para la fecha de efecto) y lo común a los reportes. */
export interface BaseDelCorte {
  empresaId: string;
  /** `AAAA-MM-DD`. */
  corte: string;
  fechaDeInicio: string | null;
  proveedorId?: string;
  autorizacion: FiltroDeAutorizacion;
}

/** Cuántos documentos y de cuánto, para un aviso. */
export interface ConteoConMonto {
  cantidad: number;
  totalCentavos: number;
}

/** Un cheque posfechado que el banco cobró antes de su fecha, sin que se sepa el día (§2.1). */
export interface ChequeCobradoAntes {
  /** El número del pago como se lee (`15` o `2026-15`). */
  numeroDelPago: string;
  /** El número del cheque, si Bancos lo guarda. */
  referencia: string | null;
  anio: number;
  mes: number;
}

/** Lo que se cuenta para los avisos del corte; los textos los arma `avisosDeSaldos`. */
export interface DatosParaAvisosDelCorte {
  anterioresAlInicio: ConteoConMonto;
  registradosDespues: ConteoConMonto;
  chequesCobradosAntes: ChequeCobradoAntes[];
}

/** Los filtros propios del reporte de documentos a una fecha (R2). */
export interface FiltroDeDocumentosAlCorte extends BaseDelCorte {
  tipo?: Exclude<TipoDeDocumento, 'nota_de_credito'>;
  origen?: OrigenDeDocumento;
  /** Solo los cargos con saldo vencidos al corte. */
  vencidos: boolean;
  /** Solo los cargos con saldo que vencen entre el corte y esta fecha. */
  venceHasta?: string;
  sinContrasena: boolean;
  /** Sin él, solo entran los cargos con saldo al corte. */
  estadoDePago?: EstadoDePago;
  emitidosDesde?: string;
  emitidosHasta?: string;
  conRetencionesPorPracticar: boolean;
}

/** La contraseña vigente de un documento y el día en que se prometió pagarla. */
export interface ContrasenaDelDocumento {
  numero: string;
  pagoPrometido: string;
}

/** Un cargo al corte con todo lo que lo explica, en centavos. */
export interface FilaDeDocumentoAlCorte {
  id: string;
  proveedorId: string;
  proveedorNombre: string;
  proveedorNit: string | null;
  tipo: TipoDeDocumento;
  origen: OrigenDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  vencimiento: string | null;
  diasVencido: number | null;
  totalCentavos: number;
  retencionesCentavos: number;
  netoCentavos: number;
  /** Solo en un saldo inicial: lo que se pagó o rebajó antes de la fecha de inicio (neto menos saldo al inicio). */
  anterioresAlInicioCentavos: number | null;
  aplicadoCentavos: number;
  pagadoCentavos: number;
  ajustadoCentavos: number;
  saldoCentavos: number;
  comprometidoCentavos: number;
  estadoDePago: EstadoDePago;
  autorizado: boolean;
  contrasena: ContrasenaDelDocumento | null;
  /** Solo en un saldo inicial, informativa. */
  retencionesPorPracticarCentavos: number | null;
}

/** Las sumas de todo lo filtrado, no solo de la página. */
export interface TotalesDeDocumentosAlCorte {
  cantidad: number;
  totalCentavos: number;
  retencionesCentavos: number;
  pagadoCentavos: number;
  saldoCentavos: number;
  comprometidoCentavos: number;
}

export interface PaginaDeDocumentosAlCorte {
  filas: FilaDeDocumentoAlCorte[];
  totales: TotalesDeDocumentosAlCorte;
}

/** La consulta del saldo a una fecha de corte (`ConsultaDeSaldosAlCorte`): una sola, para todos los reportes de saldos. */
export interface ConsultasDeSaldosAlCorte {
  proveedorExiste(proveedorId: string): Promise<boolean>;
  /** Las cifras de cada proveedor con documentos al corte (R1; el reparto por NIT y en bloques es del dominio). */
  saldosPorProveedor(base: BaseDelCorte): Promise<SaldoDeProveedor[]>;
  avisosDelCorte(base: BaseDelCorte): Promise<DatosParaAvisosDelCorte>;
  /** Los cargos al corte (R2); sin `pagina`, todos (para Excel). */
  documentos(
    filtro: FiltroDeDocumentosAlCorte,
    pagina: PaginacionDeDocumentos | null,
  ): Promise<PaginaDeDocumentosAlCorte>;
}
