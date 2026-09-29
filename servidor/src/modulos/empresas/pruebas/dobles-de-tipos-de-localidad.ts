import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { TipoDeLocalidadDto } from '../aplicacion/dto/tipo-de-localidad.dto.js';
import type { ConsultasTiposDeLocalidad } from '../aplicacion/puertos/consultas-tipos-de-localidad.js';
import type { RepositorioTiposDeLocalidad } from '../aplicacion/puertos/repositorio-tipos-de-localidad.js';
import type { TipoDeLocalidad, TipoDeLocalidadId } from '../dominio/tipo-de-localidad.js';

function aDto(tipoDeLocalidad: TipoDeLocalidad): TipoDeLocalidadDto {
  const { id, empresaId, ...datos } = tipoDeLocalidad.instantanea();
  return { ...datos, id: id.valor };
}

/** Guarda los tipos de localidad en memoria y responde tanto de repositorio como de consultas. */
export class TiposDeLocalidadEnMemoria implements RepositorioTiposDeLocalidad, ConsultasTiposDeLocalidad {
  private readonly registros = new Map<string, TipoDeLocalidad>();

  async buscar(id: TipoDeLocalidadId): Promise<TipoDeLocalidad | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(tipoDeLocalidad: TipoDeLocalidad): Promise<void> {
    this.registros.set(tipoDeLocalidad.id.valor, tipoDeLocalidad);
  }

  async guardar(tipoDeLocalidad: TipoDeLocalidad): Promise<void> {
    this.registros.set(tipoDeLocalidad.id.valor, tipoDeLocalidad);
  }

  async eliminar(tipoDeLocalidad: TipoDeLocalidad): Promise<void> {
    this.registros.delete(tipoDeLocalidad.id.valor);
  }

  async hayAlguno(): Promise<boolean> {
    return this.registros.size > 0;
  }

  async sembrar(tipos: readonly TipoDeLocalidad[]): Promise<void> {
    const nombres = new Set([...this.registros.values()].map((tipo) => tipo.instantanea().nombre));
    for (const tipo of tipos) {
      if (!nombres.has(tipo.instantanea().nombre)) this.registros.set(tipo.id.valor, tipo);
    }
  }

  async listar(): Promise<TipoDeLocalidadDto[]> {
    const porNombre = (a: TipoDeLocalidadDto, b: TipoDeLocalidadDto) =>
      String(a.nombre).localeCompare(String(b.nombre));
    return [...this.registros.values()].map(aDto).sort(porNombre);
  }

  async obtener(tipoDeLocalidadId: string): Promise<TipoDeLocalidadDto> {
    const tipoDeLocalidad = this.registros.get(tipoDeLocalidadId);
    if (!tipoDeLocalidad) throw new RecursoNoEncontrado('El tipo de localidad');
    return aDto(tipoDeLocalidad);
  }
}
