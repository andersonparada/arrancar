import type { CausaDeAjuste } from '../../dominio/ajustes.js';

/** Lo que filtra R8: el mes (primer y último día, inclusive), un proveedor y, en los ajustes, una causa. */
export interface FiltroDeAjustesDelMes {
  empresaId: string;
  desde: string;
  hasta: string;
  proveedorId?: string;
  causa?: CausaDeAjuste;
}

/** Qué ajustes se piden: los fechados en el mes o los anulados en el mes que son de otro. */
export type SeccionDeAjustes = 'del_mes' | 'anulados_de_otros_meses';

/** Un ajuste de saldo con su documento y quién lo hizo y anuló (secciones 1 y 2). */
export interface AjusteDelMes {
  id: string;
  fecha: string;
  documentoId: string;
  serie: string | null;
  numero: string;
  emisionDelDocumento: string;
  proveedorId: string;
  proveedorNombre: string;
  causa: CausaDeAjuste;
  /** Solo en la diferencia de centavos de un cargo. */
  numeroDelPago: string | null;
  montoCentavos: number;
  referencia: string | null;
  motivo: string;
  registro: string | null;
  estado: 'vigente' | 'anulado';
  anuladoPor: string | null;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
}

/** Una compensación sin dinero entre una nota y un cargo (sección 3). */
export interface AplicacionManualDelMes {
  id: string;
  fecha: string;
  proveedorId: string;
  proveedorNombre: string;
  nota: string;
  cargo: string;
  montoCentavos: number;
  referencia: string | null;
  registro: string | null;
}

/** Un pago contra la cuenta de apertura (sección 4). */
export interface PagoAAperturaDelMes {
  id: string;
  numeroDelPago: string;
  fecha: string;
  proveedorId: string;
  proveedorNombre: string;
  montoCentavos: number;
  motivo: string | null;
  conCargaCerrada: boolean;
  registro: string | null;
  estado: 'vigente' | 'anulado';
}

/** Un documento que se anuló o se devolvió a revisión en el mes (sección 5). */
export interface DocumentoRevertidoEnElMes {
  documentoId: string;
  tipoDeBaja: 'anulado' | 'desautorizado';
  serie: string | null;
  numero: string;
  proveedorId: string;
  proveedorNombre: string;
  emision: string;
  totalCentavos: number;
  estabaAutorizado: boolean;
  motivo: string | null;
  quien: string | null;
  cuando: string;
}

/** Las consultas del reporte de ajustes del mes (R8). */
export interface ConsultasDeReportesDeControl {
  ajustes(filtro: FiltroDeAjustesDelMes, seccion: SeccionDeAjustes): Promise<AjusteDelMes[]>;
  aplicacionesManuales(filtro: FiltroDeAjustesDelMes): Promise<AplicacionManualDelMes[]>;
  pagosAApertura(filtro: FiltroDeAjustesDelMes): Promise<PagoAAperturaDelMes[]>;
  documentosAnulados(filtro: FiltroDeAjustesDelMes): Promise<DocumentoRevertidoEnElMes[]>;
  documentosDesautorizados(filtro: FiltroDeAjustesDelMes): Promise<DocumentoRevertidoEnElMes[]>;
}
