import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { TipoDeParcelaDto } from '../aplicacion/dto/tipo-de-parcela.dto.js';
import type { ConsultasTiposDeParcela } from '../aplicacion/puertos/consultas-tipos-de-parcela.js';
import type { RepositorioTiposDeParcela } from '../aplicacion/puertos/repositorio-tipos-de-parcela.js';
import type { TipoDeParcela, TipoDeParcelaId } from '../dominio/tipo-de-parcela.js';

function aDto(tipoDeParcela: TipoDeParcela): TipoDeParcelaDto {
  const { id, empresaId, ...datos } = tipoDeParcela.instantanea();
  return { ...datos, id: id.valor };
}

/** Guarda los tipos de parcela en memoria y responde tanto de repositorio como de consultas. */
export class TiposDeParcelaEnMemoria implements RepositorioTiposDeParcela, ConsultasTiposDeParcela {
  private readonly registros = new Map<string, TipoDeParcela>();

  async buscar(id: TipoDeParcelaId): Promise<TipoDeParcela | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(tipoDeParcela: TipoDeParcela): Promise<void> {
    this.registros.set(tipoDeParcela.id.valor, tipoDeParcela);
  }

  async guardar(tipoDeParcela: TipoDeParcela): Promise<void> {
    this.registros.set(tipoDeParcela.id.valor, tipoDeParcela);
  }

  async eliminar(tipoDeParcela: TipoDeParcela): Promise<void> {
    this.registros.delete(tipoDeParcela.id.valor);
  }

  async hayAlguno(): Promise<boolean> {
    return this.registros.size > 0;
  }

  async sembrar(tipos: readonly TipoDeParcela[]): Promise<void> {
    for (const tipo of tipos) this.registros.set(tipo.id.valor, tipo);
  }

  async listar(): Promise<TipoDeParcelaDto[]> {
    const porNombre = (a: TipoDeParcelaDto, b: TipoDeParcelaDto) => String(a.nombre).localeCompare(String(b.nombre));
    return [...this.registros.values()].map(aDto).sort(porNombre);
  }

  async obtener(tipoDeParcelaId: string): Promise<TipoDeParcelaDto> {
    const tipoDeParcela = this.registros.get(tipoDeParcelaId);
    if (!tipoDeParcela) throw new RecursoNoEncontrado('El tipo de parcela');
    return aDto(tipoDeParcela);
  }
}
