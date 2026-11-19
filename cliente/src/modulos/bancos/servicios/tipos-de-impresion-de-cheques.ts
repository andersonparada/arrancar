import type { ChequeArmado } from './tipos-de-formatos-de-cheque';

/** Lo que el servidor manda para imprimir un cheque y su comprobante de egreso (`docs/modulos/diseno-impresion-de-cheques.md`). */

export interface DetalleDelOrigen {
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

export interface FirmaDelComprobante {
  rotulo: string;
  nombre: string | null;
  conDpiYFecha: boolean;
}

export interface ComprobanteDeEgreso {
  titulo: string;
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
  origen: DetalleDelOrigen | null;
  aplicacionContable: { renglonesEnBlanco: number };
  firmas: FirmaDelComprobante[];
  leyenda: string;
}

/** Un cheque listo para imprimir: lo que se dibuja en el papel y su comprobante. */
export interface ChequeParaImprimir {
  chequeId: string;
  numero: number;
  serie: string | null;
  /** El cheque ya figura como impreso (siempre, tras imprimirlo). */
  impreso: boolean;
  /** `null` si solo se imprime el comprobante. */
  cheque: ChequeArmado | null;
  comprobante: ComprobanteDeEgreso;
  /** Dónde va el comprobante dentro de la hoja del cheque (voucher); `null` = en hoja carta aparte. */
  zonaDelComprobante: { yMm: number; altoMm: number } | null;
  /** Avisos que no bloquean: formulario con leyendas ya impresas, formato sin probar. */
  avisos: string[];
}

/** La vista de impresión de uno o varios cheques de una chequera. */
export interface VistaDeImpresion {
  cheques: ChequeParaImprimir[];
  /** Los del lote: huecos en la numeración. */
  avisos: string[];
  loteId: string | null;
}

export interface ImpresionRegistrada {
  id: string;
  tipo: 'original' | 'reimpresion';
  conCheque: boolean;
  motivo: string | null;
  loteId: string | null;
  impresoEn: string;
  impresoPorId: string;
  impresoPorNombre: string | null;
}

export interface DatosDeReimpresion {
  motivo: string;
  conCheque: boolean;
}
