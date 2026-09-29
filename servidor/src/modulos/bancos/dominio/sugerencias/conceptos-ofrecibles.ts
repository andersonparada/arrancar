import { ErrorEsperado } from '../../../core/compartido/dominio/errores.js';
import {
  CLAVE_DE_PAGO_A_PROVEEDORES,
  exigirConceptoElegible,
  type TipoDeMovimiento,
} from '../asignacion-de-concepto.js';
import type { PropiedadesDeConcepto } from '../concepto.js';

type ConceptoParaOfrecer = Pick<PropiedadesDeConcepto, 'aplicaA' | 'activo' | 'claveDeSistema'>;

/**
 * Si el concepto se puede ofrecer a un movimiento de ese tipo: las mismas reglas que al elegirlo
 * (`exigirConceptoElegible`). «Pago a proveedores» solo a un cheque y solo si Cuentas por pagar no está activo (P3).
 */
export function sePuedeOfrecer(
  concepto: ConceptoParaOfrecer,
  tipo: TipoDeMovimiento,
  cuentasPorPagarActivo: boolean,
): boolean {
  const permitido =
    tipo === 'cheque' && !cuentasPorPagarActivo && concepto.claveDeSistema === CLAVE_DE_PAGO_A_PROVEEDORES;
  try {
    exigirConceptoElegible(concepto, tipo, { pagoAProveedores: permitido ? 'permitido' : undefined });
    return true;
  } catch (error) {
    if (error instanceof ErrorEsperado) return false;
    throw error;
  }
}
