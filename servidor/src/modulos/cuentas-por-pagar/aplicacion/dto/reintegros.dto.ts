import type { EstadoDeUnPago } from '../../dominio/pagos.js';
import type { FormaDeReintegro } from '../../dominio/reintegros.js';
import type { EmpresaDeLaImpresion } from '../puertos/puertos-de-impresion-de-contrasenas.js';

/** Lo que el reintegro devolvió de una nota de crédito. Dinero como texto con dos decimales. */
export interface NotaDelReintegroDto {
  notaId: string;
  serie: string | null;
  numero: string;
  monto: string;
}

/** La nota de crédito que Bancos registró para el depósito. `numero` es el de la nota. */
export interface MovimientoDelReintegroDto {
  id: string;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  numero: number;
}

/** El reintegro con los avisos que no bloquean al registrarlo; vacíos al leerlo después. */
export interface ReintegroDto {
  id: string;
  /** Como se lee: `15` o `2026-15`. */
  numero: string;
  proveedor: { id: string; nombre: string; nit: string | null };
  forma: FormaDeReintegro;
  fecha: string;
  monto: string;
  /** Solo en el depósito. */
  movimiento: MovimientoDelReintegroDto | null;
  /** La boleta del depósito o el recibo de caja del efectivo. */
  referencia: string | null;
  observaciones: string | null;
  estado: EstadoDeUnPago;
  notas: NotaDelReintegroDto[];
  anulacion: { fecha: string; motivo: string } | null;
  avisos: string[];
  /** Vigente: Bancos anula la nota del depósito con inverso, también si ya está conciliada. */
  puedeAnular: boolean;
}

/** El «Recibo de reintegro» listo para imprimir (C-CP4-6). Dinero como texto con dos decimales. */
export interface ReciboDeReintegroDto {
  numero: string;
  fecha: string;
  estado: EstadoDeUnPago;
  empresa: EmpresaDeLaImpresion;
  /** El nombre del NIT del proveedor, no el comercial. */
  proveedor: { nombre: string; nit: string | null };
  forma: FormaDeReintegro;
  /** La cuenta donde se depositó; `null` en efectivo. */
  cuentaBancaria: string | null;
  /** La boleta del depósito o el recibo de caja. */
  referencia: string | null;
  notas: Array<{ serie: string | null; numero: string; monto: string }>;
  total: string;
  totalEnLetras: string;
  /** Quién firma por la empresa y quién por el proveedor. */
  recibidoPor: string;
  entregadoPor: string;
  leyenda: string;
}
