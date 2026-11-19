import type { ConceptoDeClaseDto } from '../dto/concepto-de-clase.dto.js';

/** Qué clase propone la bandeja para cada concepto de gasto del libro de compras. */
export interface RelacionClasesConceptos {
  /** Los conceptos que proponen la clase, por nombre. */
  deLaClase(claseId: string): Promise<ConceptoDeClaseDto[]>;
  /** De esos conceptos, los que existen en la empresa y la clase que hoy proponen (si alguna). */
  actuales(conceptoIds: readonly string[]): Promise<ConceptoDeClaseDto[]>;
  /** Hace que cada concepto proponga esta clase; si ya proponía otra, la cambia. */
  poner(empresaId: string, claseId: string, conceptoIds: readonly string[]): Promise<void>;
  quitar(claseId: string, conceptoIds: readonly string[]): Promise<void>;
}
