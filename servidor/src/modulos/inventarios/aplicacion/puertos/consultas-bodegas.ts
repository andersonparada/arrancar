import type { BodegaDto, SolicitudDeBodega } from '../dto/bodega.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasBodegas {
  listar(): Promise<BodegaDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(bodegaId: string): Promise<BodegaDto>;
  /**
   * La localidad y el responsable elegidos deben existir y ser de la empresa (el responsable, un usuario que trabaja
   * en ella).
   * @throws RecursoNoEncontrado si alguno no existe o el operador no lo ve.
   */
  exigirReferencias(solicitud: Pick<SolicitudDeBodega, 'localidadId' | 'responsableUsuarioId'>): Promise<void>;
}
