import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { FormaDePago } from './pagos.js';
import type { OrigenDeDocumento } from './tipos-de-documento.js';

/** Lo que un pago entregó a un cargo, para que Contabilidad reparta la partida. */
export interface AplicacionDelEvento {
  documentoId: string;
  documentoDeCompraId: string | null;
  origen: OrigenDeDocumento;
  montoCentavos: number;
  retencionDescontadaCentavos: number;
  tieneActivoFijo: boolean;
}

/** Qué cuenta usa Contabilidad: el banco, la transitoria de notas por aplicar, la apertura, la corrección de error o el efectivo. */
export type EfectoDePago = 'banco' | 'transitoria_por_aplicar' | 'apertura' | 'correccion_de_error' | 'efectivo';

export interface DatosDePagoRegistrado {
  empresaId: string;
  pagoId: string;
  numero: number;
  contrasenaIds: string[];
  proveedorId: string;
  forma: FormaDePago;
  /** La del cheque (Contabilidad fecha la partida aquí, también si está posfechado). */
  fecha: string;
  posfechado: boolean;
  montoCentavos: number;
  movimientoId: string | null;
  cuentaBancariaId: string | null;
  retiroId: string | null;
  sinBancarizar: boolean;
  efecto: EfectoDePago;
  aplicaciones: AplicacionDelEvento[];
}

/** Se registró un pago a un proveedor. Se publica tras confirmar la transacción. */
export class PagoRegistrado extends EventoDominio<DatosDePagoRegistrado> {
  readonly nombre = 'cuentas-por-pagar.pago_registrado';

  constructor(datos: DatosDePagoRegistrado) {
    super(datos);
  }
}

export interface DatosDePagoReaplicado {
  empresaId: string;
  pagoId: string;
  /** La de la reaplicación (hoy). */
  fecha: string;
  fechaDelPago: string;
  efecto: EfectoDePago;
  retiroId: string | null;
  antes: AplicacionDelEvento[];
  despues: AplicacionDelEvento[];
}

/** Un pago vigente pasó a cubrir otros cargos; el dinero y su movimiento no cambian. Se publica tras confirmar. */
export class PagoReaplicado extends EventoDominio<DatosDePagoReaplicado> {
  readonly nombre = 'cuentas-por-pagar.pago_reaplicado';

  constructor(datos: DatosDePagoReaplicado) {
    super(datos);
  }
}

export interface DatosDePagoAnulado {
  empresaId: string;
  pagoId: string;
  /** La fecha contable de la anulación (CP5-a). */
  fecha: string;
  /** La del pago. */
  fechaOriginal: string;
  /** `null` en la nota ligada, la cuenta de apertura y el efectivo (nada se anula en Bancos). */
  anulacionEnBancos: 'sin_inverso' | 'con_inverso' | null;
  montoCentavos: number;
  efecto: EfectoDePago;
  movimientoId: string | null;
  retiroId: string | null;
}

/** Un pago se anuló: Contabilidad revierte su partida con `fecha` (o la cancela si fue «sin inverso»). Se publica tras confirmar. */
export class PagoAnulado extends EventoDominio<DatosDePagoAnulado> {
  readonly nombre = 'cuentas-por-pagar.pago_anulado';

  constructor(datos: DatosDePagoAnulado) {
    super(datos);
  }
}
