import type { FormaDeReintegro, NotaDelReintegro, Reintegro } from '../../dominio/reintegros.js';

/** El reintegro listo para guardar: el id lo genera el caso de uso porque es el origen de la nota de crédito en Bancos. */
export interface ReintegroNuevo {
  id: string;
  proveedorId: string;
  numero: number;
  anioDeNumero: number;
  forma: FormaDeReintegro;
  /** `AAAA-MM-DD`. */
  fecha: string;
  montoCentavos: number;
  /** Solo en el depósito. */
  movimientoId: string | null;
  referencia: string | null;
  observaciones: string | null;
  notas: NotaDelReintegro[];
}

/** Cómo se anula un reintegro guardado. */
export interface AnulacionDeReintegro {
  anuladoPor: string;
  motivo: string;
  /** `AAAA-MM-DD`: la fecha contable de la anulación (CP5-a). */
  fechaDeAnulacion: string;
}

export interface RepositorioDeReintegros {
  /** Guarda el reintegro `vigente` con sus líneas. */
  agregar(reintegro: ReintegroNuevo): Promise<void>;
  /** El reintegro con sus líneas; `null` si no existe en la empresa. */
  buscar(id: string): Promise<Reintegro | null>;
  /** Igual que `buscar`, y deja la fila bloqueada para este caso de uso. */
  bloquear(id: string): Promise<Reintegro | null>;
  /** El reintegro cuya nota de crédito en Bancos es este movimiento; también si está anulado. */
  delMovimiento(movimientoId: string): Promise<Reintegro | null>;
  /** Lo deja `anulado` con quién, cuándo, por qué y la fecha contable, y sus líneas `vigente = false`. */
  anular(id: string, anulacion: AnulacionDeReintegro): Promise<void>;
}

/** Lo que se lee de Terceros y de Bancos para mostrar el reintegro y su recibo. */
export interface ConsultasDeReintegros {
  /** Nombre y NIT del proveedor de la cuenta activa; `null` si no existe. */
  proveedor(proveedorId: string): Promise<{ nombre: string; nit: string | null } | null>;
  /** El nombre de la cuenta bancaria; `null` si no existe. */
  nombreDeLaCuenta(cuentaBancariaId: string): Promise<string | null>;
}
