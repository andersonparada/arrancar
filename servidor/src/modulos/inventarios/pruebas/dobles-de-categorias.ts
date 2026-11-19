import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { CategoriaDto } from '../aplicacion/dto/categoria.dto.js';
import type { ConsultasCategorias } from '../aplicacion/puertos/consultas-categorias.js';
import type { RepositorioCategorias } from '../aplicacion/puertos/repositorio-categorias.js';
import type { Categoria, CategoriaId } from '../dominio/categoria.js';

function aDto(categoria: Categoria): CategoriaDto {
  const { id, empresaId, ...datos } = categoria.instantanea();
  return { ...datos, id: id.valor };
}

/** Guarda las categorías en memoria y responde tanto de repositorio como de consultas. */
export class CategoriasEnMemoria implements RepositorioCategorias, ConsultasCategorias {
  private readonly registros = new Map<string, Categoria>();

  async buscar(id: CategoriaId): Promise<Categoria | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(categoria: Categoria): Promise<void> {
    this.registros.set(categoria.id.valor, categoria);
  }

  async guardar(categoria: Categoria): Promise<void> {
    this.registros.set(categoria.id.valor, categoria);
  }

  async eliminar(categoria: Categoria): Promise<void> {
    this.registros.delete(categoria.id.valor);
  }

  /** Los registros que tienen algo ligado; la prueba los marca con `ligar`. */
  readonly ligadas = new Set<string>();

  async enUso(id: CategoriaId): Promise<boolean> {
    return this.ligadas.has(id.valor);
  }

  async listar(): Promise<CategoriaDto[]> {
    const porNombre = (a: CategoriaDto, b: CategoriaDto) => String(a.nombre).localeCompare(String(b.nombre));
    return [...this.registros.values()].map(aDto).sort(porNombre);
  }

  async obtener(categoriaId: string): Promise<CategoriaDto> {
    const categoria = this.registros.get(categoriaId);
    if (!categoria) throw new RecursoNoEncontrado('La categoría');
    return aDto(categoria);
  }
}
