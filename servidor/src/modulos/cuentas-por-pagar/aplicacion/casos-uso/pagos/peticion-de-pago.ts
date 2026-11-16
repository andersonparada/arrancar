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

/** Lo que el guardador sabe guardar: las formas que emiten en Bancos y la que liga una nota ya registrada. */
export type PeticionGuardable = PeticionDePago | PeticionDeNotaLigada;
