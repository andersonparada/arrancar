import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { CombustibleDto } from '../aplicacion/dto/combustible.dto.js';
import type { ConsultasCombustibles } from '../aplicacion/puertos/consultas-combustibles.js';
import type { RepositorioCombustibles } from '../aplicacion/puertos/repositorio-combustibles.js';
import type { Combustible, CombustibleId } from '../dominio/combustible.js';

function aDto(combustible: Combustible): CombustibleDto {
  const { id, empresaId, ...datos } = combustible.instantanea();
  return { ...datos, id: id.valor };
}

/** Guarda los combustibles en memoria y responde tanto de repositorio como de consultas. */
export class CombustiblesEnMemoria implements RepositorioCombustibles, ConsultasCombustibles {
  private readonly registros = new Map<string, Combustible>();

  async buscar(id: CombustibleId): Promise<Combustible | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(combustible: Combustible): Promise<void> {
    this.registros.set(combustible.id.valor, combustible);
  }

  async guardar(combustible: Combustible): Promise<void> {
    this.registros.set(combustible.id.valor, combustible);
  }

  async listar(): Promise<CombustibleDto[]> {
    const porNombre = (a: CombustibleDto, b: CombustibleDto) => String(a.nombre).localeCompare(String(b.nombre));
    return [...this.registros.values()].map(aDto).sort(porNombre);
  }

  async obtener(combustibleId: string): Promise<CombustibleDto> {
    const combustible = this.registros.get(combustibleId);
    if (!combustible) throw new RecursoNoEncontrado('El combustible');
    return aDto(combustible);
  }
}
