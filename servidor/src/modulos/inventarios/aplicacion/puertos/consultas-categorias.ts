import type { CategoriaDto } from '../dto/categoria.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasCategorias {
  listar(): Promise<CategoriaDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(categoriaId: string): Promise<CategoriaDto>;
}
