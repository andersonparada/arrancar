import type { FormaDePago } from '../../dominio/pagos.js';
import type { OrigenDeDocumento, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';
import type { RetencionDeLaLineaDto } from './ficha-de-pago.dto.js';

/** El documento pagado, en la hoja. */
export interface DocumentoDelComprobanteDto {
  documentoId: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  origen: OrigenDeDocumento;
  total: string;
  /** Todas las retenciones del documento. */
  retenciones: string;
  /** Lo que las notas de crédito rebajaron. */
  notasAplicadas: string;
  /** La retención que este pago descuenta; con ella, las constancias de cada impuesto. */
  retencionDescontada: string;
  constancias: RetencionDeLaLineaDto[];
  /** Lo que este pago entregó. */
  pagado: string;
  /** Lo que cubre: lo pagado más la retención. */
  cubre: string;
  /** Lo que le queda por pagar hoy. */
  saldo: string;
}

export interface ContrasenaDelComprobanteDto {
  id: string;
  numero: string;
  documentos: DocumentoDelComprobanteDto[];
  /** Lo que este pago entregó dentro de la contraseña. */
  pagado: string;
}

export interface FirmaDelComprobanteDto {
  rotulo: string;
  /** El que se conoce de antemano (el custodio, quien recibió); si no, la línea queda en blanco. */
  nombre: string | null;
}

/** El comprobante de un pago listo para imprimir en original y copia. No es un documento tributario. */
export interface ComprobanteDePagoDto {
  titulo: string;
  /** Un pago en efectivo: el comprobante es el recibo. */
  esReciboDeEfectivo: boolean;
  hojas: ['Original', 'Copia'];
  empresa: { nombre: string; nit: string | null; razonSocial: string | null; nombreComercial: string | null };
  proveedor: { id: string; nombre: string; nit: string | null };
  beneficiario: string;
  pago: {
    id: string;
    numero: string;
    forma: FormaDePago;
    fecha: string;
    /** Un cheque con fecha posterior a hoy: «Cheque posfechado al dd/mm/aaaa». */
    posfechado: boolean;
    estado: 'vigente' | 'anulado';
    anulacion: { fecha: string; motivo: string } | null;
    referencia: string | null;
    motivo: string | null;
    observaciones: string | null;
  };
  /** El documento bancario: cheque o nota de Bancos. */
  medio: { cuentaBancariaNombre: string; tipo: string; numero: number } | null;
  retiro: { numero: string; custodio: string } | null;
  contrasenas: ContrasenaDelComprobanteDto[];
  totalPagado: string;
  totalRetenciones: string;
  totalCubierto: string;
  /** `MIL CIENTO VEINTE QUETZALES CON 00/100`. */
  totalEnLetras: string;
  leyendas: string[];
  firmas: { entrega: FirmaDelComprobanteDto; recibe: FirmaDelComprobanteDto };
}
