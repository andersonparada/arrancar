import type { ArticuloDto, SolicitudDeArticulo } from '../dto/articulo.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasArticulos {
  listar(): Promise<ArticuloDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(articuloId: string): Promise<ArticuloDto>;
  /** @throws RecursoNoEncontrado si algo que se eligió no existe o es ajeno. */
  exigirReferencias(solicitud: SolicitudDeArticulo): Promise<void>;
  /** Si algún artículo de la empresa ya usa el código (sin distinguir mayúsculas). */
  existeCodigo(codigo: string): Promise<boolean>;
}
