import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { UnidadDto } from '../aplicacion/dto/unidad.dto.js';
import type { ConsultasUnidades } from '../aplicacion/puertos/consultas-unidades.js';
import type { RepositorioUnidades } from '../aplicacion/puertos/repositorio-unidades.js';
import type { Unidad, UnidadId } from '../dominio/unidad.js';

function aDto(unidad: Unidad): UnidadDto {
  const { id, empresaId, ...datos } = unidad.instantanea();
  return { ...datos, id: id.valor };
}

/** Guarda las unidades de medida en memoria y responde tanto de repositorio como de consultas. */
export class UnidadesEnMemoria implements RepositorioUnidades, ConsultasUnidades {
  private readonly registros = new Map<string, Unidad>();

  async buscar(id: UnidadId): Promise<Unidad | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(unidad: Unidad): Promise<void> {
    this.registros.set(unidad.id.valor, unidad);
  }

  async guardar(unidad: Unidad): Promise<void> {
    this.registros.set(unidad.id.valor, unidad);
  }

  async eliminar(unidad: Unidad): Promise<void> {
    this.registros.delete(unidad.id.valor);
  }

  /** Los registros que tienen algo ligado; la prueba los marca con `ligar`. */
  readonly ligadas = new Set<string>();

  async enUso(id: UnidadId): Promise<boolean> {
    return this.ligadas.has(id.valor);
  }

  async hayAlguna(): Promise<boolean> {
    return this.registros.size > 0;
  }

  async sembrar(nuevas: readonly Unidad[]): Promise<void> {
    for (const unidad of nuevas) this.registros.set(unidad.id.valor, unidad);
  }

  async listar(): Promise<UnidadDto[]> {
    const porNombre = (a: UnidadDto, b: UnidadDto) => String(a.nombre).localeCompare(String(b.nombre));
    return [...this.registros.values()].map(aDto).sort(porNombre);
  }

  async obtener(unidadId: string): Promise<UnidadDto> {
    const unidad = this.registros.get(unidadId);
    if (!unidad) throw new RecursoNoEncontrado('La unidad de medida');
    return aDto(unidad);
  }
}
