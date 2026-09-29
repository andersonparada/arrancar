import type { PropiedadesDeConcepto } from './concepto.js';
import { ConceptoDeSistemaNoSeElige, ConceptoIncompatible, ConceptoInactivo } from './errores-de-conceptos.js';

/** Lo que una nota o un cheque original le exige al concepto que se elige. El cheque cuenta como débito. */
export type TipoDeMovimiento = 'credito' | 'debito' | 'cheque';

type ConceptoElegido = Pick<PropiedadesDeConcepto, 'aplicaA' | 'activo' | 'claveDeSistema'>;

interface Tolerancias {
  /** El movimiento ya tenía este concepto (al corregirlo): no se le exige que siga activo. */
  yaAsignado?: boolean;
}

/**
 * Las reglas para elegir el concepto de una nota o un cheque **original** (informe del contador, C2 y C5):
 * no de sistema (así `sin_clasificar` nunca se elige), activo y compatible con `aplica_a`. Los inversos
 * no pasan por aquí: heredan el concepto de su original sin validar nada.
 * @throws ConceptoDeSistemaNoSeElige, ConceptoInactivo o ConceptoIncompatible.
 */
export function exigirConceptoElegible(
  concepto: ConceptoElegido,
  tipo: TipoDeMovimiento,
  { yaAsignado = false }: Tolerancias = {},
): void {
  if (concepto.claveDeSistema !== null) throw new ConceptoDeSistemaNoSeElige();
  if (!concepto.activo && !yaAsignado) throw new ConceptoInactivo();
  exigirCompatibilidad(concepto.aplicaA, tipo);
}

/** El cheque cuenta como débito; un concepto «ambos» sirve para cualquiera. */
function exigirCompatibilidad(aplicaA: ConceptoElegido['aplicaA'], tipo: TipoDeMovimiento): void {
  const direccion = tipo === 'credito' ? 'credito' : 'debito';
  if (aplicaA !== 'ambos' && aplicaA !== direccion) throw new ConceptoIncompatible(aplicaA);
}
