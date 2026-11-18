import type { FormaDeReintegro } from '../../../dominio/reintegros.js';

/** Lo que se pide al registrar un reintegro: el dinero como texto con dos decimales. */
export interface PeticionDeReintegro {
  proveedorId: string;
  forma: FormaDeReintegro;
  /** `AAAA-MM-DD`; hoy si falta. */
  fecha?: string;
  /** Solo en el depósito. */
  cuentaBancariaId?: string | null;
  /** La boleta del depósito o, en efectivo y obligatoria, el recibo de caja. */
  referencia?: string | null;
  observaciones?: string | null;
  notas: Array<{ notaId: string; monto: string }>;
}
