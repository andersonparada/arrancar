import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { ConceptoDeIngresoDto } from '../aplicacion/dto/concepto-de-ingreso.dto.js';
import type { ConsultasConceptosDeIngreso } from '../aplicacion/puertos/consultas-conceptos-de-ingreso.js';
import type { RepositorioConceptosDeIngreso } from '../aplicacion/puertos/repositorio-conceptos-de-ingreso.js';
import type { ConceptoDeIngreso, ConceptoDeIngresoId } from '../dominio/concepto-de-ingreso.js';

function aDto(conceptoDeIngreso: ConceptoDeIngreso): ConceptoDeIngresoDto {
  const { id, empresaId, ...datos } = conceptoDeIngreso.instantanea();
  return { ...datos, id: id.valor };
}

/** Guarda los conceptos de ingreso en memoria y responde tanto de repositorio como de consultas. */
export class ConceptosDeIngresoEnMemoria implements RepositorioConceptosDeIngreso, ConsultasConceptosDeIngreso {
  private readonly registros = new Map<string, ConceptoDeIngreso>();

  async buscar(id: ConceptoDeIngresoId): Promise<ConceptoDeIngreso | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(conceptoDeIngreso: ConceptoDeIngreso): Promise<void> {
    this.registros.set(conceptoDeIngreso.id.valor, conceptoDeIngreso);
  }

  async guardar(conceptoDeIngreso: ConceptoDeIngreso): Promise<void> {
    this.registros.set(conceptoDeIngreso.id.valor, conceptoDeIngreso);
  }

  /** Los conceptos que el doble tiene en uso por líneas (se marcan desde la prueba). */
  readonly enUsoPorLineas = new Set<string>();

  async eliminar(conceptoDeIngreso: ConceptoDeIngreso): Promise<void> {
    this.registros.delete(conceptoDeIngreso.id.valor);
  }

  async enUso(id: ConceptoDeIngresoId): Promise<boolean> {
    return this.enUsoPorLineas.has(id.valor);
  }

  async hayAlguno(): Promise<boolean> {
    return this.registros.size > 0;
  }

  async sembrar(nuevos: readonly ConceptoDeIngreso[]): Promise<void> {
    for (const concepto of nuevos) this.registros.set(concepto.id.valor, concepto);
  }

  async listar(): Promise<ConceptoDeIngresoDto[]> {
    const porNombre = (a: ConceptoDeIngresoDto, b: ConceptoDeIngresoDto) =>
      String(a.nombre).localeCompare(String(b.nombre));
    return [...this.registros.values()].map(aDto).sort(porNombre);
  }

  async obtener(conceptoDeIngresoId: string): Promise<ConceptoDeIngresoDto> {
    const conceptoDeIngreso = this.registros.get(conceptoDeIngresoId);
    if (!conceptoDeIngreso) throw new RecursoNoEncontrado('El concepto de ingreso');
    return aDto(conceptoDeIngreso);
  }
}
