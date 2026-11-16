import type { EstadoDeUnPago, FormaDePago } from '../../dominio/pagos.js';
import type { OrigenDeDocumento, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';

/** Una contraseña vigente del proveedor, con su número como se lee (`15` o `2026-15`). */
export interface ContrasenaDelPagoDto {
  id: string;
  numero: string;
}

/** Lo que el pago entrega a un cargo, con la contraseña de donde sale. Dinero como texto con dos decimales. */
export interface AplicacionDelPagoDto {
  documentoId: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  origen: OrigenDeDocumento;
  total: string;
  retenciones: string;
  contrasena: ContrasenaDelPagoDto;
  /** La retención que este pago descuenta: las del cargo en su primer pago vigente, cero después. */
  retencionDescontada: string;
  monto: string;
  /** Lo que el pago cubre del cargo: el monto en dinero más la retención en constancia. */
  cubre: string;
}

/** La diferencia de centavos que se dio por saldada de un cargo del pago. */
export interface DiferenciaDelPagoDto {
  cargoId: string;
  monto: string;
}

/** El movimiento que Bancos creó para el pago. `numero` es el del cheque o el de la nota. */
export interface MovimientoDelPagoDto {
  id: string;
  cuentaBancariaId: string;
  numero: number;
}

/** El pago con los avisos que no bloquean al registrarlo (los suyos y los de Bancos); vacíos al leerlo después. */
export interface PagoDto {
  id: string;
  /** Como se lee: `15` o `2026-15`. */
  numero: string;
  contrasenas: ContrasenaDelPagoDto[];
  proveedor: { id: string; nombre: string; nit: string | null };
  /** El nombre del NIT del proveedor: lo que va en el cheque o la nota. */
  beneficiario: string;
  forma: FormaDePago;
  fecha: string;
  /** Con fecha posterior a hoy el pago es un cheque posfechado: el documento queda comprometido. */
  posfechado: boolean;
  monto: string;
  /** `null` en la cuenta de apertura y en efectivo. */
  movimiento: MovimientoDelPagoDto | null;
  observaciones: string | null;
  estado: EstadoDeUnPago;
  /** Solo en un pago anulado: la fecha contable de la anulación y el motivo. */
  anulacion: { fecha: string; motivo: string } | null;
  aplicaciones: AplicacionDelPagoDto[];
  diferencias: DiferenciaDelPagoDto[];
  avisos: string[];
}
