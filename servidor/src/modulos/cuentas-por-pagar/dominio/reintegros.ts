import { numeroDeContrasena } from './contrasena.js';
import type { EstadoDeUnPago } from './pagos.js';

/** Cómo devolvió el proveedor el saldo a favor: con un depósito en el banco o en efectivo. */
export type FormaDeReintegro = 'deposito' | 'efectivo';

/** Clave del correlativo de los reintegros en `core.correlativos` (el «Recibo de reintegro»). */
export const CLAVE_DE_REINTEGROS = 'cuentas-por-pagar.reintegros';

/** El recurso con que se audita anular un reintegro. */
export const RECURSO_DE_REINTEGROS = 'cuentas-por-pagar.reintegros';

/** Tope de notas de crédito en un mismo reintegro. */
export const MAXIMO_DE_NOTAS_POR_REINTEGRO = 100;

/** El número del reintegro como se lee: `15` o `2026-15`. */
export const numeroDelReintegro = numeroDeContrasena;

/** Lo que un reintegro devolvió contra una nota de crédito. */
export interface NotaDelReintegro {
  notaId: string;
  montoCentavos: number;
}

/**
 * Lo que el proveedor devuelve a la empresa contra el saldo libre de una o varias notas de crédito. Es un cobro: no va en
 * contraseñas. Un depósito tiene su nota de crédito en Bancos (`movimientoId`); el efectivo, su recibo (`referencia`).
 */
export interface Reintegro {
  id: string;
  proveedorId: string;
  /** Correlativo; con `anioDeNumero` forma el número que ve el usuario (`numeroDelReintegro`). */
  numero: number;
  anioDeNumero: number;
  forma: FormaDeReintegro;
  /** `AAAA-MM-DD`: la del depósito o la del recibo de caja. */
  fecha: string;
  montoCentavos: number;
  movimientoId: string | null;
  referencia: string | null;
  observaciones: string | null;
  estado: EstadoDeUnPago;
  /** `AAAA-MM-DD`; solo en un reintegro anulado. */
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
  notas: NotaDelReintegro[];
}

/** Qué cuenta usa Contabilidad: el banco (depósito) o el efectivo recibido. */
export type EfectoDeReintegro = 'banco' | 'efectivo';

export const efectoDelReintegro = ({ forma }: Pick<Reintegro, 'forma'>): EfectoDeReintegro =>
  forma === 'deposito' ? 'banco' : 'efectivo';
