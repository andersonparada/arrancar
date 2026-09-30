import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { VigenciaDeCombustibleDto } from '../aplicacion/dto/vigencia-de-combustible.dto.js';
import type { ConsultasVigenciasDeCombustible } from '../aplicacion/puertos/consultas-vigencias-de-combustible.js';
import type { RepositorioVigenciasDeCombustible } from '../aplicacion/puertos/repositorio-vigencias-de-combustible.js';
import type {
  UsoDeVigencia,
  VigenciaDeCombustible,
  VigenciaDeCombustibleId,
} from '../dominio/vigencia-de-combustible.js';

function aDto(vigenciaDeCombustible: VigenciaDeCombustible): VigenciaDeCombustibleDto {
  const { id, empresaId, ...datos } = vigenciaDeCombustible.instantanea();
  return { ...datos, id: id.valor, combustibleNombre: null };
}

/** Guarda las vigencias de combustible en memoria y responde tanto de repositorio como de consultas. */
export class VigenciasDeCombustibleEnMemoria
  implements RepositorioVigenciasDeCombustible, ConsultasVigenciasDeCombustible
{
  private readonly registros = new Map<string, VigenciaDeCombustible>();
  private readonly usos = new Map<string, UsoDeVigencia>();
  /** Combustibles bloqueados, en el orden en que se pidió. */
  readonly bloqueos: string[] = [];

  /** Simula que documentos ya usan la vigencia (L3 lo hará de verdad). */
  marcarEnUso(id: string, ultimaFechaDeEmision: string): void {
    this.usos.set(id, { ultimaFechaDeEmision });
  }

  async buscar(id: VigenciaDeCombustibleId): Promise<VigenciaDeCombustible | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async buscarAbierta(combustibleId: string): Promise<VigenciaDeCombustible | null> {
    const abiertas = [...this.registros.values()].filter(
      (vigencia) => vigencia.instantanea().combustibleId === combustibleId && vigencia.estaAbierta(),
    );
    return abiertas[0] ?? null;
  }

  async bloquearCombustible(combustibleId: string): Promise<void> {
    this.bloqueos.push(combustibleId);
  }

  async enUso(id: VigenciaDeCombustibleId): Promise<UsoDeVigencia | null> {
    return this.usos.get(id.valor) ?? null;
  }

  async agregar(vigenciaDeCombustible: VigenciaDeCombustible): Promise<void> {
    this.registros.set(vigenciaDeCombustible.id.valor, vigenciaDeCombustible);
  }

  async guardar(vigenciaDeCombustible: VigenciaDeCombustible): Promise<void> {
    this.registros.set(vigenciaDeCombustible.id.valor, vigenciaDeCombustible);
  }

  async eliminar(vigenciaDeCombustible: VigenciaDeCombustible): Promise<void> {
    this.registros.delete(vigenciaDeCombustible.id.valor);
  }

  async listar(): Promise<VigenciaDeCombustibleDto[]> {
    const porNombre = (a: VigenciaDeCombustibleDto, b: VigenciaDeCombustibleDto) =>
      String(a.vigenteDesde).localeCompare(String(b.vigenteDesde));
    return [...this.registros.values()].map(aDto).sort(porNombre);
  }

  async obtener(vigenciaDeCombustibleId: string): Promise<VigenciaDeCombustibleDto> {
    const vigenciaDeCombustible = this.registros.get(vigenciaDeCombustibleId);
    if (!vigenciaDeCombustible) throw new RecursoNoEncontrado('La vigencia de combustible');
    return aDto(vigenciaDeCombustible);
  }

  /** En memoria, todo lo elegido existe. */
  exigirReferencias(): Promise<void> {
    return Promise.resolve();
  }
}
