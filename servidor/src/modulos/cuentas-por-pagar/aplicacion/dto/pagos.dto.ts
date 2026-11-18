import type { EstadoDePago, EstadoDeUnPago, FormaDePago } from '../../dominio/pagos.js';

/** Lo que un pago entregó a un cargo, tal como queda en la ficha y en la auditoría. Dinero como texto con dos decimales. */
export interface LineaDePagoDto {
  pagoId: string;
  /** Como se lee: `15` o `2026-15`. */
  numero: string;
  forma: FormaDePago;
  fecha: string;
  estado: EstadoDeUnPago;
  /** La contraseña de esta línea. */
  contrasenaId: string;
  monto: string;
  /** La retención que este pago «descontó» del cargo (constancia); no resta del saldo, ya viene en el neto. */
  retencionDescontada: string;
}

/** Un pago en la ficha del cargo; `comprometido` es un pago vigente con fecha posterior a hoy (cheque posfechado). */
export interface PagoDelDocumentoDto extends LineaDePagoDto {
  comprometido: boolean;
  /** El número del cheque con que se pagó; `null` si no fue con cheque. */
  numeroDeCheque: string | null;
}

/** Lo que un reintegro devolvió contra una nota de crédito. */
export interface ReintegroDelDocumentoDto {
  reintegroId: string;
  numero: string;
  forma: 'deposito' | 'efectivo';
  fecha: string;
  estado: EstadoDeUnPago;
  monto: string;
}

/** Un pago de una contraseña, con lo que entregó a los cargos de ella (lista corta de la contraseña). */
export interface PagoDeLaContrasenaDto {
  pagoId: string;
  numero: string;
  forma: FormaDePago;
  fecha: string;
  estado: EstadoDeUnPago;
  /** Lo que este pago entregó dentro de esta contraseña. */
  monto: string;
  comprometido: boolean;
  /** El número del cheque con que se pagó; `null` si no fue con cheque. */
  numeroDeCheque: string | null;
}

/** Cómo va el pago de un cargo o de una contraseña; `null` en lo que no se paga (notas, anulados). */
export type EstadoDePagoDto = EstadoDePago | null;
