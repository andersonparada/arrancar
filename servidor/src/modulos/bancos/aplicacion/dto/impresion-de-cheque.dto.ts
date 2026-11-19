import type { ChequeArmado } from '../../dominio/impresion-de-cheque.js';

/** El documento que originó el cheque, como lo dice su módulo (hoy, el pago de Cuentas por pagar). */
export interface DetalleDelOrigenDto {
  modulo: string;
  /** «Pago 15 de Cuentas por pagar». */
  descripcion: string;
  documentos: Array<{
    tipo: string;
    serie: string | null;
    numero: string;
    monto: string;
    retenciones: Array<{ impuesto: 'iva' | 'isr'; monto: string; constanciaNumero: string | null }>;
  }>;
  /** `null` si el módulo no informa retenciones. */
  totalRetenido: string | null;
}

/** Una firma del comprobante: el rótulo y, si ya se sabe, quién. «Recibí conforme» lleva además línea de DPI y fecha. */
export interface FirmaDelComprobanteDto {
  rotulo: string;
  nombre: string | null;
  conDpiYFecha: boolean;
}

/** El comprobante de egreso: es para el archivo de la empresa, no un documento tributario. */
export interface ComprobanteDeEgresoDto {
  titulo: string;
  /** Desde la segunda impresión lleva la marca «REIMPRESIÓN». */
  esReimpresion: boolean;
  empresa: { nombre: string; nit: string | null };
  cuenta: { nombre: string; numero: string; banco: string };
  cheque: {
    numero: number;
    serie: string | null;
    fecha: string;
    beneficiario: string;
    monto: string;
    montoEnLetras: string;
    concepto: string;
    referencia: string | null;
    observaciones: string | null;
    noNegociable: boolean;
    paraAbonoEnCuenta: boolean;
  };
  /** Del módulo de origen; sin él (o sin detalle), `descripcion` dice de dónde viene. */
  origen: DetalleDelOrigenDto | null;
  /** Para llenar a mano; cuando exista Contabilidad la llenará el sistema. */
  aplicacionContable: { renglonesEnBlanco: number };
  firmas: FirmaDelComprobanteDto[];
  leyenda: string;
}

/** Un cheque listo para imprimir: lo que se dibuja en el papel y su comprobante. */
export interface ChequeParaImprimirDto {
  chequeId: string;
  numero: number;
  serie: string | null;
  /** El cheque ya figura como impreso (con su marca): siempre, tras imprimirlo. */
  impreso: boolean;
  /** `null` si solo se imprime el comprobante. */
  cheque: ChequeArmado | null;
  comprobante: ComprobanteDeEgresoDto;
  /** Avisos que no bloquean: formulario con leyendas ya impresas, formato sin probar. */
  avisos: string[];
}

/** La vista de impresión de uno o varios cheques (lote de una chequera). */
export interface VistaDeImpresionDto {
  cheques: ChequeParaImprimirDto[];
  /** Los del lote: huecos en la numeración. */
  avisos: string[];
  loteId: string | null;
}

/** Una impresión registrada, para la historia del cheque. */
export interface ImpresionRegistradaDto {
  id: string;
  tipo: 'original' | 'reimpresion';
  conCheque: boolean;
  motivo: string | null;
  loteId: string | null;
  impresoEn: string;
  impresoPorId: string;
  impresoPorNombre: string | null;
}
