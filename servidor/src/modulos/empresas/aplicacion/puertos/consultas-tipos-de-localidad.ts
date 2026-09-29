import type { TipoDeLocalidadDto } from '../dto/tipo-de-localidad.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasTiposDeLocalidad {
  listar(): Promise<TipoDeLocalidadDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(tipoDeLocalidadId: string): Promise<TipoDeLocalidadDto>;
}
