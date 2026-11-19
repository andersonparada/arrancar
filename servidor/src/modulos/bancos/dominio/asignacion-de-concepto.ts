import type { PropiedadesDeConcepto } from './concepto.js';
import { CONCEPTOS_RESERVADOS_POR_MODULO } from './conceptos-reservados.js';
import {
  ConceptoDeSistemaNoSeElige,
  ConceptoIncompatible,
  ConceptoInactivo,
  ConceptoReservadoPorSuModulo,
} from './errores-de-conceptos.js';

/** Lo que una nota o un cheque original le exige al concepto que se elige. El cheque cuenta como débito. */
export type TipoDeMovimiento = 'credito' | 'debito' | 'cheque';

type ConceptoElegido = Pick<PropiedadesDeConcepto, 'aplicaA' | 'activo' | 'claveDeSistema'>;

interface Tolerancias {
  /** El movimiento ya tenía este concepto (al corregirlo): no se le exige que siga activo. */
  yaAsignado?: boolean;
  /**
   * Los módulos activos de la cuenta. Un concepto de sistema reservado por un módulo (`CONCEPTOS_RESERVADOS_POR_MODULO`)
   * se puede elegir a mano si ese módulo no está activo; activo, lo registra él. Sin este dato ninguno se elige.
   */
  modulosActivos?: ReadonlySet<string>;
}

/** La clave de «Pago a proveedores», que Cuentas por pagar reserva. */
export const CLAVE_DE_PAGO_A_PROVEEDORES = 'pago_a_proveedor';

/**
 * Las reglas para elegir el concepto de una nota o un cheque **original** (informe del contador, C2 y C5):
 * no de sistema (así `sin_clasificar` nunca se elige; la excepción son los reservados de un módulo inactivo), activo y compatible con `aplica_a`. Los inversos
 * no pasan por aquí: heredan el concepto de su original sin validar nada.
 * @throws ConceptoDeSistemaNoSeElige, ConceptoInactivo o ConceptoIncompatible.
 */
export function exigirConceptoElegible(
  concepto: ConceptoElegido,
  tipo: TipoDeMovimiento,
  { yaAsignado = false, modulosActivos }: Tolerancias = {},
): void {
  exigirQueSeaElegible(concepto.claveDeSistema, tipo, modulosActivos);
  if (!concepto.activo && !yaAsignado) throw new ConceptoInactivo();
  exigirCompatibilidad(concepto.aplicaA, tipo);
}

/** Ningún concepto de sistema se elige, salvo el reservado por un módulo que no está activo. */
function exigirQueSeaElegible(
  clave: string | null,
  tipo: TipoDeMovimiento,
  modulosActivos: Tolerancias['modulosActivos'],
): void {
  if (clave === null) return;
  const modulo = CONCEPTOS_RESERVADOS_POR_MODULO[clave];
  if (modulo === undefined || modulosActivos === undefined) throw new ConceptoDeSistemaNoSeElige();
  // «Pago a proveedores» sigue siendo solo de los cheques (P3): en una nota es la marca de Cuentas por pagar.
  if (clave === CLAVE_DE_PAGO_A_PROVEEDORES && tipo !== 'cheque') throw new ConceptoDeSistemaNoSeElige();
  if (modulosActivos.has(modulo)) throw new ConceptoReservadoPorSuModulo(modulo);
}

/** El cheque cuenta como débito; un concepto «ambos» sirve para cualquiera. */
function exigirCompatibilidad(aplicaA: ConceptoElegido['aplicaA'], tipo: TipoDeMovimiento): void {
  const direccion = tipo === 'credito' ? 'credito' : 'debito';
  if (aplicaA !== 'ambos' && aplicaA !== direccion) throw new ConceptoIncompatible(aplicaA);
}
