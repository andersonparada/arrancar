import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { ConceptoDto } from '../aplicacion/dto/concepto.dto.js';
import type { ConsultasConceptos } from '../aplicacion/puertos/consultas-conceptos.js';
import type { RepositorioConceptos } from '../aplicacion/puertos/repositorio-conceptos.js';
import type { Concepto, ConceptoId } from '../dominio/concepto.js';

function aDto(concepto: Concepto): ConceptoDto {
  const { id, empresaId, ...datos } = concepto.instantanea();
  return { ...datos, id: id.valor };
}

/** Guarda los conceptos en memoria y responde tanto de repositorio como de consultas. */
export class ConceptosEnMemoria implements RepositorioConceptos, ConsultasConceptos {
  private readonly registros = new Map<string, Concepto>();
  /** Ids de conceptos que, para la prueba, ya clasifican notas o cheques. */
  readonly enUso = new Set<string>();

  async buscar(id: ConceptoId): Promise<Concepto | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async buscarDeSistema(clave: string): Promise<Concepto | null> {
    return [...this.registros.values()].find((c) => c.instantanea().claveDeSistema === clave) ?? null;
  }

  /** Deja conceptos ya guardados, sin esperar (para armar el entorno de una prueba). */
  precargar(...conceptos: Concepto[]): this {
    for (const concepto of conceptos) this.registros.set(concepto.id.valor, concepto);
    return this;
  }

  async agregar(concepto: Concepto): Promise<void> {
    this.registros.set(concepto.id.valor, concepto);
  }

  async guardar(concepto: Concepto): Promise<void> {
    this.registros.set(concepto.id.valor, concepto);
  }

  async eliminar(id: ConceptoId): Promise<void> {
    this.registros.delete(id.valor);
  }

  async hayAlguno(): Promise<boolean> {
    return this.registros.size > 0;
  }

  async sembrar(nuevos: readonly Concepto[]): Promise<void> {
    const nombres = new Set([...this.registros.values()].map((c) => c.instantanea().nombre));
    for (const concepto of nuevos) {
      if (!nombres.has(concepto.instantanea().nombre)) this.registros.set(concepto.id.valor, concepto);
    }
  }

  async listar(): Promise<ConceptoDto[]> {
    const porNombre = (a: ConceptoDto, b: ConceptoDto) => String(a.nombre).localeCompare(String(b.nombre));
    return [...this.registros.values()].map(aDto).sort(porNombre);
  }

  async obtener(conceptoId: string): Promise<ConceptoDto> {
    const concepto = this.registros.get(conceptoId);
    if (!concepto) throw new RecursoNoEncontrado('El concepto');
    return aDto(concepto);
  }

  async estaEnUso(conceptoId: string): Promise<boolean> {
    return this.enUso.has(conceptoId);
  }
}
