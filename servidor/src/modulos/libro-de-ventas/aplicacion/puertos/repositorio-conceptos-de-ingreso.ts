import type { ConceptoDeIngreso, ConceptoDeIngresoId } from '../../dominio/concepto-de-ingreso.js';

/** Guarda y recupera los conceptos de ingreso para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioConceptosDeIngreso {
  buscar(id: ConceptoDeIngresoId): Promise<ConceptoDeIngreso | null>;
  agregar(conceptoDeIngreso: ConceptoDeIngreso): Promise<void>;
  guardar(conceptoDeIngreso: ConceptoDeIngreso): Promise<void>;
  eliminar(conceptoDeIngreso: ConceptoDeIngreso): Promise<void>;
  /** Si algún documento de venta tiene líneas con este concepto (desde LV-2; antes no puede haberlas). */
  enUso(id: ConceptoDeIngresoId): Promise<boolean>;
  hayAlguno(): Promise<boolean>;
  /** Agrega los sugeridos; si una carrera ya los puso, no repite. */
  sembrar(nuevos: readonly ConceptoDeIngreso[]): Promise<void>;
}
