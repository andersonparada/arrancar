import type { PropiedadesDeConcepto } from './concepto.js';
import {
  ConceptoDeSistemaNoSeElige,
  ConceptoIncompatible,
  ConceptoInactivo,
  PagoAProveedoresLoFijaCuentasPorPagar,
} from './errores-de-conceptos.js';

/** Lo que una nota o un cheque original le exige al concepto que se elige. El cheque cuenta como débito. */
export type TipoDeMovimiento = 'credito' | 'debito' | 'cheque';

type ConceptoElegido = Pick<PropiedadesDeConcepto, 'aplicaA' | 'activo' | 'claveDeSistema'>;

interface Tolerancias {
  /** El movimiento ya tenía este concepto (al corregirlo): no se le exige que siga activo. */
  yaAsignado?: boolean;
  /**
   * Solo para un cheque manual (P3): «Pago a proveedores» es de sistema, pero se puede elegir a mano si Cuentas
   * por pagar no está activo (`'permitido'`); si lo está (`'reservado'`) lo fija ese módulo.
   */
  pagoAProveedores?: 'permitido' | 'reservado';
}

/** La clave del concepto de sistema que un cheque manual puede elegir cuando no hay Cuentas por pagar. */
export const CLAVE_DE_PAGO_A_PROVEEDORES = 'pago_a_proveedor';

/**
 * Las reglas para elegir el concepto de una nota o un cheque **original** (informe del contador, C2 y C5):
 * no de sistema (así `sin_clasificar` nunca se elige; la excepción de P3 es de los cheques), activo y compatible con `aplica_a`. Los inversos
 * no pasan por aquí: heredan el concepto de su original sin validar nada.
 * @throws ConceptoDeSistemaNoSeElige, ConceptoInactivo o ConceptoIncompatible.
 */
export function exigirConceptoElegible(
  concepto: ConceptoElegido,
  tipo: TipoDeMovimiento,
  { yaAsignado = false, pagoAProveedores }: Tolerancias = {},
): void {
  exigirQueSeaElegible(concepto.claveDeSistema, pagoAProveedores);
  if (!concepto.activo && !yaAsignado) throw new ConceptoInactivo();
  exigirCompatibilidad(concepto.aplicaA, tipo);
}

/** Ningún concepto de sistema se elige, salvo «Pago a proveedores» en un cheque manual sin Cuentas por pagar. */
function exigirQueSeaElegible(clave: string | null, pagoAProveedores: Tolerancias['pagoAProveedores']): void {
  if (clave === null) return;
  if (clave !== CLAVE_DE_PAGO_A_PROVEEDORES || pagoAProveedores === undefined) throw new ConceptoDeSistemaNoSeElige();
  if (pagoAProveedores === 'reservado') throw new PagoAProveedoresLoFijaCuentasPorPagar();
}

/** El cheque cuenta como débito; un concepto «ambos» sirve para cualquiera. */
function exigirCompatibilidad(aplicaA: ConceptoElegido['aplicaA'], tipo: TipoDeMovimiento): void {
  const direccion = tipo === 'credito' ? 'credito' : 'debito';
  if (aplicaA !== 'ambos' && aplicaA !== direccion) throw new ConceptoIncompatible(aplicaA);
}
