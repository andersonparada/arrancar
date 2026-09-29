import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import { dtoDeLocalidad } from '../aplicacion/datos-de-localidad.js';
import type { LocalidadDto } from '../aplicacion/dto/localidad.dto.js';
import type {
  ConsultasDeAccesosALocalidades,
  UsuarioConAcceso,
} from '../aplicacion/puertos/consultas-de-accesos-a-localidades.js';
import type { ConsultasLocalidades } from '../aplicacion/puertos/consultas-localidades.js';
import type { RepositorioLocalidades } from '../aplicacion/puertos/repositorio-localidades.js';
import type { Localidad, LocalidadId } from '../dominio/localidad.js';

/** Guarda las localidades en memoria y responde tanto de repositorio como de consultas. */
export class LocalidadesEnMemoria implements RepositorioLocalidades, ConsultasLocalidades {
  private readonly registros = new Map<string, Localidad>();

  async buscar(id: LocalidadId): Promise<Localidad | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(localidad: Localidad): Promise<void> {
    this.registros.set(localidad.id.valor, localidad);
  }

  async guardar(localidad: Localidad): Promise<void> {
    this.registros.set(localidad.id.valor, localidad);
  }

  async eliminar(localidad: Localidad): Promise<void> {
    this.registros.delete(localidad.id.valor);
  }

  async listar(): Promise<LocalidadDto[]> {
    const porNombre = (a: LocalidadDto, b: LocalidadDto) => String(a.nombre).localeCompare(String(b.nombre));
    return [...this.registros.values()].map(dtoDeLocalidad).sort(porNombre);
  }

  async obtener(localidadId: string): Promise<LocalidadDto> {
    const localidad = this.registros.get(localidadId);
    if (!localidad) throw new RecursoNoEncontrado('La localidad');
    return dtoDeLocalidad(localidad);
  }

  /** En memoria, todo lo elegido existe. */
  exigirReferencias(): Promise<void> {
    return Promise.resolve();
  }
}

/** Los accesos en memoria: simulan el disparador que asigna la localidad nueva a quien la crea. */
export class AccesosALocalidadesEnMemoria implements ConsultasDeAccesosALocalidades {
  constructor(private readonly asignados: UsuarioConAcceso[] = []) {}

  async usuariosConAcceso(): Promise<UsuarioConAcceso[]> {
    return this.asignados;
  }
}
