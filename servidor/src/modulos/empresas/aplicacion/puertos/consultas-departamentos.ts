import type { DepartamentoDto, SolicitudDeDepartamento } from '../dto/departamento.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasDepartamentos {
  listar(): Promise<DepartamentoDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(departamentoId: string): Promise<DepartamentoDto>;
  /** @throws RecursoNoEncontrado si algo que se eligió no existe o es ajeno. */
  exigirReferencias(solicitud: SolicitudDeDepartamento): Promise<void>;
}
