import type { CausaDeAjuste, EfectoDelAjuste } from '../../dominio/ajustes.js';

/** Un ajuste de saldo en R8 (secciones 1 y 2). */
export interface FilaDeAjusteDelMesDto {
  id: string;
  fecha: string;
  documentoId: string;
  documento: string;
  proveedorId: string;
  proveedorNombre: string;
  causa: CausaDeAjuste;
  efecto: EfectoDelAjuste;
  monto: string;
  referencia: string | null;
  motivo: string;
  /** El pago que dejó la diferencia de centavos, si es de un cargo. */
  pago: string | null;
  registro: string | null;
  estado: 'vigente' | 'anulado';
  anuladoPor: string | null;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  /** El documento es de un año anterior al del ajuste. */
  anioAnterior: boolean;
}

export interface FilaDeAplicacionManualDto {
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

export interface FilaDePagoAAperturaDto {
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

/** Un documento anulado o devuelto a revisión en el mes (sección 5). */
export interface FilaDeDocumentoRevertidoDto {
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
  /** Su emisión es de un mes anterior al del reporte: puede pedir rectificar el IVA. */
  deUnMesAnterior: boolean;
  /** El texto de la marca, solo cuando `deUnMesAnterior`. */
  marca: string | null;
}

export interface TotalPorCausaDto {
  causa: CausaDeAjuste;
  efecto: EfectoDelAjuste;
  cantidad: number;
  monto: string;
}

/** R8: lo que cambió en el mes, para que el contador lo revise al cerrar. */
export interface ReporteDeAjustesDelMesDto {
  /** `AAAA-MM`. */
  mes: string;
  ajustes: FilaDeAjusteDelMesDto[];
  anulacionesDeOtrosMeses: FilaDeAjusteDelMesDto[];
  aplicacionesManuales: FilaDeAplicacionManualDto[];
  pagosAApertura: FilaDePagoAAperturaDto[];
  documentosAnulados: FilaDeDocumentoRevertidoDto[];
  documentosDesautorizados: FilaDeDocumentoRevertidoDto[];
  totales: {
    /** Solo los ajustes vigentes del mes. */
    porCausa: TotalPorCausaDto[];
    ajustesAnulados: { cantidad: number; monto: string };
    porSeccion: {
      ajustes: { cantidad: number; monto: string };
      anulacionesDeOtrosMeses: { cantidad: number; monto: string };
      aplicacionesManuales: { cantidad: number; monto: string };
      pagosAApertura: { cantidad: number; monto: string };
      documentosAnulados: { cantidad: number; monto: string };
      documentosDesautorizados: { cantidad: number; monto: string };
    };
  };
  leyendas: string[];
}
