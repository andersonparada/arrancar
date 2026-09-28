import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { BancoDto } from '../aplicacion/dto/banco.dto.js';
import type { ConsultasBancos } from '../aplicacion/puertos/consultas-bancos.js';
import type { RepositorioBancos } from '../aplicacion/puertos/repositorio-bancos.js';
import type { Banco, BancoId } from '../dominio/banco.js';

function aDto(banco: Banco): BancoDto {
  const { id, empresaId, ...datos } = banco.instantanea();
  return { ...datos, id: id.valor };
}

/** Guarda los bancos en memoria y responde tanto de repositorio como de consultas. */
export class BancosEnMemoria implements RepositorioBancos, ConsultasBancos {
  private readonly registros = new Map<string, Banco>();

  async buscar(id: BancoId): Promise<Banco | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(banco: Banco): Promise<void> {
    this.registros.set(banco.id.valor, banco);
  }

  async guardar(banco: Banco): Promise<void> {
    this.registros.set(banco.id.valor, banco);
  }

  async listar(): Promise<BancoDto[]> {
    const porNombre = (a: BancoDto, b: BancoDto) => String(a.nombre).localeCompare(String(b.nombre));
    return [...this.registros.values()].map(aDto).sort(porNombre);
  }

  async obtener(bancoId: string): Promise<BancoDto> {
    const banco = this.registros.get(bancoId);
    if (!banco) throw new RecursoNoEncontrado('El banco');
    return aDto(banco);
  }
}
