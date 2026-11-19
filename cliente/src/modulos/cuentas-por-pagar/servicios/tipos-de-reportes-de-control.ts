export type CausaDelAjusteEnReporte = 'no_recuperable' | 'diferencia_menor' | 'compensado_con_otra_cuenta';
export type EfectoDelAjusteEnReporte = 'perdida' | 'transitoria' | 'ingreso';

/** Un ajuste de saldo en R8 (secciones 1 y 2). */
export interface FilaDeAjusteDelMes {
  id: string;
  fecha: string;
  documentoId: string;
  documento: string;
  proveedorId: string;
  proveedorNombre: string;
  causa: CausaDelAjusteEnReporte;
  efecto: EfectoDelAjusteEnReporte;
  monto: string;
  referencia: string | null;
  motivo: string;
  pago: string | null;
  registro: string | null;
  estado: 'vigente' | 'anulado';
  anuladoPor: string | null;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  anioAnterior: boolean;
}

export interface FilaDeAplicacionManual {
  id: string;
  fecha: string;
  proveedorId: string;
  proveedorNombre: string;
  nota: string;
  cargo: string;
  monto: string;
  referencia: string | null;
  registro: string | null;
}

export interface FilaDePagoAApertura {
  id: string;
  numeroDelPago: string;
  fecha: string;
  proveedorId: string;
  proveedorNombre: string;
  monto: string;
  motivo: string | null;
  conCargaCerrada: boolean;
  registro: string | null;
  estado: 'vigente' | 'anulado';
}

export interface FilaDeDocumentoRevertido {
  documentoId: string;
  tipoDeBaja: 'anulado' | 'desautorizado';
  documento: string;
  proveedorId: string;
  proveedorNombre: string;
  emision: string;
  total: string;
  estabaAutorizado: boolean;
  motivo: string | null;
  quien: string | null;
  cuando: string;
  deUnMesAnterior: boolean;
  marca: string | null;
}

export interface TotalPorCausa {
  causa: CausaDelAjusteEnReporte;
  efecto: EfectoDelAjusteEnReporte;
  cantidad: number;
  monto: string;
}

export interface CantidadYMonto {
  cantidad: number;
  monto: string;
}

export interface TotalesPorSeccion {
  ajustes: CantidadYMonto;
  anulacionesDeOtrosMeses: CantidadYMonto;
  aplicacionesManuales: CantidadYMonto;
  pagosAApertura: CantidadYMonto;
  documentosAnulados: CantidadYMonto;
  documentosDesautorizados: CantidadYMonto;
}

export interface ReporteDeAjustesDelMes {
  /** `AAAA-MM`. */
  mes: string;
  ajustes: FilaDeAjusteDelMes[];
  anulacionesDeOtrosMeses: FilaDeAjusteDelMes[];
  aplicacionesManuales: FilaDeAplicacionManual[];
  pagosAApertura: FilaDePagoAApertura[];
  documentosAnulados: FilaDeDocumentoRevertido[];
  documentosDesautorizados: FilaDeDocumentoRevertido[];
  totales: { porCausa: TotalPorCausa[]; ajustesAnulados: CantidadYMonto; porSeccion: TotalesPorSeccion };
  leyendas: string[];
}
