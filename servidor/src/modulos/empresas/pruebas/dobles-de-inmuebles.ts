import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { InmuebleDto } from '../aplicacion/dto/inmueble.dto.js';
import type { ConsultasInmuebles } from '../aplicacion/puertos/consultas-inmuebles.js';
import type { RepositorioInmuebles } from '../aplicacion/puertos/repositorio-inmuebles.js';
import type { Inmueble, InmuebleId } from '../dominio/inmueble.js';

function aDto(inmueble: Inmueble): InmuebleDto {
  const { id, empresaId, ...datos } = inmueble.instantanea();
  return { ...datos, id: id.valor, localidadNombre: null };
}

/** Guarda los inmuebles en memoria y responde tanto de repositorio como de consultas. */
export class InmueblesEnMemoria implements RepositorioInmuebles, ConsultasInmuebles {
  private readonly registros = new Map<string, Inmueble>();

  async buscar(id: InmuebleId): Promise<Inmueble | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(inmueble: Inmueble): Promise<void> {
    this.registros.set(inmueble.id.valor, inmueble);
  }

  async guardar(inmueble: Inmueble): Promise<void> {
    this.registros.set(inmueble.id.valor, inmueble);
  }

  async eliminar(inmueble: Inmueble): Promise<void> {
    this.registros.delete(inmueble.id.valor);
  }

  async listar(): Promise<InmuebleDto[]> {
    const porNombre = (a: InmuebleDto, b: InmuebleDto) => String(a.nombre).localeCompare(String(b.nombre));
    return [...this.registros.values()].map(aDto).sort(porNombre);
  }

  async obtener(inmuebleId: string): Promise<InmuebleDto> {
    const inmueble = this.registros.get(inmuebleId);
    if (!inmueble) throw new RecursoNoEncontrado('El inmueble');
    return aDto(inmueble);
  }

  /** En memoria, todo lo elegido existe. */
  exigirReferencias(): Promise<void> {
    return Promise.resolve();
  }
}
