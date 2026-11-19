import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { BodegaDto, SolicitudDeBodega } from '../aplicacion/dto/bodega.dto.js';
import type { ConsultasBodegas } from '../aplicacion/puertos/consultas-bodegas.js';
import type { RepositorioBodegas } from '../aplicacion/puertos/repositorio-bodegas.js';
import type { Bodega, BodegaId } from '../dominio/bodega.js';

function aDto(bodega: Bodega): BodegaDto {
  const { id, empresaId, ...datos } = bodega.instantanea();
  return { ...datos, id: id.valor, localidadNombre: null };
}

/** Guarda las bodegas en memoria y responde tanto de repositorio como de consultas. */
export class BodegasEnMemoria implements RepositorioBodegas, ConsultasBodegas {
  private readonly registros = new Map<string, Bodega>();

  async buscar(id: BodegaId): Promise<Bodega | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(bodega: Bodega): Promise<void> {
    this.registros.set(bodega.id.valor, bodega);
  }

  async guardar(bodega: Bodega): Promise<void> {
    this.registros.set(bodega.id.valor, bodega);
  }

  async eliminar(bodega: Bodega): Promise<void> {
    this.registros.delete(bodega.id.valor);
  }

  async exigirReferencias(_solicitud: Pick<SolicitudDeBodega, 'localidadId' | 'responsableUsuarioId'>): Promise<void> {}

  async listar(): Promise<BodegaDto[]> {
    const porNombre = (a: BodegaDto, b: BodegaDto) => String(a.codigo).localeCompare(String(b.codigo));
    return [...this.registros.values()].map(aDto).sort(porNombre);
  }

  async obtener(bodegaId: string): Promise<BodegaDto> {
    const bodega = this.registros.get(bodegaId);
    if (!bodega) throw new RecursoNoEncontrado('La bodega');
    return aDto(bodega);
  }
}
