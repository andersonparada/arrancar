import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { DepartamentoDto } from '../aplicacion/dto/departamento.dto.js';
import type { ConsultasDepartamentos } from '../aplicacion/puertos/consultas-departamentos.js';
import type { RepositorioDepartamentos } from '../aplicacion/puertos/repositorio-departamentos.js';
import type { Departamento, DepartamentoId } from '../dominio/departamento.js';

function aDto(departamento: Departamento): DepartamentoDto {
  const { id, empresaId, ...datos } = departamento.instantanea();
  return { ...datos, id: id.valor, localidadNombre: null };
}

/** Guarda los departamentos en memoria y responde tanto de repositorio como de consultas. */
export class DepartamentosEnMemoria implements RepositorioDepartamentos, ConsultasDepartamentos {
  private readonly registros = new Map<string, Departamento>();

  async buscar(id: DepartamentoId): Promise<Departamento | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(departamento: Departamento): Promise<void> {
    this.registros.set(departamento.id.valor, departamento);
  }

  async guardar(departamento: Departamento): Promise<void> {
    this.registros.set(departamento.id.valor, departamento);
  }

  async eliminar(departamento: Departamento): Promise<void> {
    this.registros.delete(departamento.id.valor);
  }

  async listar(): Promise<DepartamentoDto[]> {
    const porNombre = (a: DepartamentoDto, b: DepartamentoDto) => String(a.codigo).localeCompare(String(b.codigo));
    return [...this.registros.values()].map(aDto).sort(porNombre);
  }

  async obtener(departamentoId: string): Promise<DepartamentoDto> {
    const departamento = this.registros.get(departamentoId);
    if (!departamento) throw new RecursoNoEncontrado('El departamento');
    return aDto(departamento);
  }

  /** En memoria, todo lo elegido existe. */
  exigirReferencias(): Promise<void> {
    return Promise.resolve();
  }
}
