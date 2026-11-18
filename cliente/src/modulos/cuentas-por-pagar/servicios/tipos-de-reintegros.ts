import type { EstadoDeUnPago } from './tipos-de-pagos';

export type FormaDeReintegro = 'deposito' | 'efectivo';

/** Lo que un reintegro devolvió contra una nota de crédito, en la ficha de la nota. */
export interface ReintegroDelDocumento {
  reintegroId: string;
  /** Como se lee: `15` o `2026-15`. */
  numero: string;
  forma: FormaDeReintegro;
  fecha: string;
  estado: EstadoDeUnPago;
  monto: string;
}

export interface NotaDelReintegro {
  notaId: string;
  serie: string | null;
  numero: string;
  monto: string;
}

/** El reintegro registrado; `avisos` solo vienen al registrarlo. */
export interface Reintegro {
  id: string;
  numero: string;
  proveedor: { id: string; nombre: string; nit: string | null };
  forma: FormaDeReintegro;
  fecha: string;
  monto: string;
  movimiento: { id: string; cuentaBancariaId: string; cuentaBancariaNombre: string; numero: number } | null;
  referencia: string | null;
  observaciones: string | null;
  estado: EstadoDeUnPago;
  notas: NotaDelReintegro[];
  anulacion: { fecha: string; motivo: string } | null;
  avisos: string[];
  puedeAnular: boolean;
}

export interface SolicitudDeReintegro {
  proveedorId: string;
  forma: FormaDeReintegro;
  fecha?: string;
  cuentaBancariaId?: string | null;
  referencia?: string | null;
  observaciones?: string | null;
  notas: Array<{ notaId: string; monto: string }>;
}

export interface DatosDeAnulacionDeReintegro {
  motivo: string;
  fecha?: string;
}

/** El «Recibo de reintegro» listo para imprimir. */
export interface ReciboDeReintegro {
  numero: string;
  fecha: string;
  estado: EstadoDeUnPago;
  empresa: { nombre: string; nit: string | null; razonSocial: string | null; nombreComercial: string | null };
  proveedor: { nombre: string; nit: string | null };
  forma: FormaDeReintegro;
  cuentaBancaria: string | null;
  referencia: string | null;
  notas: Array<{ serie: string | null; numero: string; monto: string }>;
  total: string;
  totalEnLetras: string;
  recibidoPor: string;
  entregadoPor: string;
  leyenda: string;
}
