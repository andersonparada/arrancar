import { ErrorEsperado } from '../../../core/compartido/dominio/errores.js';
import { exigirConceptoElegible, type TipoDeMovimiento } from '../asignacion-de-concepto.js';
import type { PropiedadesDeConcepto } from '../concepto.js';

type ConceptoParaOfrecer = Pick<PropiedadesDeConcepto, 'aplicaA' | 'activo' | 'claveDeSistema'>;

/**
 * Si el concepto se puede ofrecer a un movimiento de ese tipo: las mismas reglas que al elegirlo
 * (`exigirConceptoElegible`): un concepto reservado por un módulo solo si ese módulo no está activo (P3, CCL-B1).
 */
export function sePuedeOfrecer(
  concepto: ConceptoParaOfrecer,
  tipo: TipoDeMovimiento,
  modulosActivos: ReadonlySet<string>,
): boolean {
  try {
    exigirConceptoElegible(concepto, tipo, { modulosActivos });
    return true;
  } catch (error) {
    if (error instanceof ErrorEsperado) return false;
    throw error;
  }
}
