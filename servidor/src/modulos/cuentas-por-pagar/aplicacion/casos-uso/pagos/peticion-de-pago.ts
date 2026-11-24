/** Lo que el cliente manda en cada forma de pago; `aplicaciones` y `diferencias` llevan el dinero como texto con dos decimales. */
interface PeticionBase {
  proveedorId: string;
  /** `AAAA-MM-DD`; hoy si falta. */
  fecha?: string;
  /** Va a Bancos (cheque y nota de débito) o se guarda en el pago (nota ligada: el recibo del proveedor). */
  referencia?: string | null;
  observaciones?: string | null;
  /** De 1 a 100 cargos de una o varias contraseñas vigentes del proveedor; la contraseña de cada línea la pone el servidor. */
  aplicaciones: Array<{ cargoId: string; monto: string }>;
  /** La diferencia de centavos que se da por saldada de un cargo del pago. */
  diferencias?: Array<{ cargoId: string; monto: string }>;
}

export interface PeticionDeCheque extends PeticionBase {
  forma: 'cheque';
  chequeraId: string;
  /** Por omisión, el siguiente cheque disponible de la chequera. */
  chequeId?: string;
  /** Por omisión, `true`. */
  noNegociable?: boolean;
  /** Por omisión, `false`. */
  paraAbonoEnCuenta?: boolean;
}

export interface PeticionDeNotaDeDebito extends PeticionBase {
  forma: 'nota_de_debito';
  cuentaBancariaId: string;
}

export type PeticionDePago = PeticionDeCheque | PeticionDeNotaDeDebito;

/** Ligar a los cargos una nota de débito que ya estaba en Bancos, marcada para Cuentas por pagar (§5.2). */
export interface PeticionDeNotaLigada extends PeticionBase {
  forma: 'nota_ligada';
  /** El movimiento de Bancos: la nota. */
  movimientoId: string;
}

/** Dar por pagado un saldo inicial sin dinero (§5.3): la excepción, con motivo obligatorio. No admite diferencias. */
export interface PeticionDeApertura extends PeticionBase {
  forma: 'cuenta_de_apertura';
  /** De 1 a 300 caracteres. */
  motivo: string;
  /** El cheque en circulación de la carga inicial que pagó lo mismo: informativo, no cambia ningún saldo (§2.4). */
  chequeDeAperturaReferidoId?: string | null;
}

/**
 * Pagar saldos iniciales con un posfechado de apertura que ya estaba en Bancos (diseño CP-AP §2.3): el monto es el del
 * cheque y la fecha, la suya; no lleva referencia, observaciones propias del cheque ni diferencias.
 */
export interface PeticionDeChequeDeApertura extends PeticionBase {
  forma: 'cheque_de_apertura';
  /** El movimiento de Bancos: el posfechado. */
  movimientoId: string;
}

/**
 * Un pago en efectivo, uno por proveedor en el reparto de un retiro (adenda de efectivo §4.2): no mueve dinero en Bancos (el
 * movimiento es del retiro); `referencia` es el recibo del proveedor, si lo dio.
 */
export interface PeticionDeEfectivo extends PeticionBase {
  forma: 'efectivo';
  retiroId: string;
  /** Quien recibió el efectivo por el proveedor (el que firma). */
  recibidoPor?: string | null;
  /** Solo si se usó la excepción de bancarización (1 a 300 caracteres). */
  motivoSinBancarizar?: string | null;
}

/** Lo que el guardador sabe guardar: las formas que emiten en Bancos, la nota ligada, la apertura y el efectivo. */
export type PeticionGuardable =
  PeticionDePago | PeticionDeNotaLigada | PeticionDeApertura | PeticionDeChequeDeApertura | PeticionDeEfectivo;
