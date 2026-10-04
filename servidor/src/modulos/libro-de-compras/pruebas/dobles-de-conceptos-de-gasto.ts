import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { ConceptoDeGastoDto } from '../aplicacion/dto/concepto-de-gasto.dto.js';
import type { ConsultasConceptosDeGasto } from '../aplicacion/puertos/consultas-conceptos-de-gasto.js';
import type { RepositorioConceptosDeGasto } from '../aplicacion/puertos/repositorio-conceptos-de-gasto.js';
import type { ConceptoDeGasto, ConceptoDeGastoId } from '../dominio/concepto-de-gasto.js';

function aDto(conceptoDeGasto: ConceptoDeGasto): ConceptoDeGastoDto {
  const { id, empresaId, ...datos } = conceptoDeGasto.instantanea();
  return { ...datos, id: id.valor };
}

/** Guarda los conceptos de gasto en memoria y responde tanto de repositorio como de consultas. */
export class ConceptosDeGastoEnMemoria implements RepositorioConceptosDeGasto, ConsultasConceptosDeGasto {
  private readonly registros = new Map<string, ConceptoDeGasto>();

  async buscar(id: ConceptoDeGastoId): Promise<ConceptoDeGasto | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(conceptoDeGasto: ConceptoDeGasto): Promise<void> {
    this.registros.set(conceptoDeGasto.id.valor, conceptoDeGasto);
  }

  async guardar(conceptoDeGasto: ConceptoDeGasto): Promise<void> {
    this.registros.set(conceptoDeGasto.id.valor, conceptoDeGasto);
  }

  async hayAlguno(): Promise<boolean> {
    return this.registros.size > 0;
  }

  async sembrar(conceptos: readonly ConceptoDeGasto[]): Promise<void> {
    conceptos.forEach((conceptoDeGasto) => this.registros.set(conceptoDeGasto.id.valor, conceptoDeGasto));
  }

  async listar(): Promise<ConceptoDeGastoDto[]> {
    const porNombre = (a: ConceptoDeGastoDto, b: ConceptoDeGastoDto) =>
      String(a.nombre).localeCompare(String(b.nombre));
    return [...this.registros.values()].map(aDto).sort(porNombre);
  }

  async obtener(conceptoDeGastoId: string): Promise<ConceptoDeGastoDto> {
    const conceptoDeGasto = this.registros.get(conceptoDeGastoId);
    if (!conceptoDeGasto) throw new RecursoNoEncontrado('El concepto de gasto');
    return aDto(conceptoDeGasto);
  }
}
