import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { FormatoDeChequeDto } from '../aplicacion/dto/formato-de-cheque.dto.js';
import type { ConsultasFormatosDeCheque } from '../aplicacion/puertos/consultas-formatos-de-cheque.js';
import type { LugarDeEmision } from '../aplicacion/puertos/lugar-de-emision.js';
import type { RepositorioFormatosDeCheque } from '../aplicacion/puertos/repositorio-formatos-de-cheque.js';
import { FormatoGuardado, type FormatoGuardadoId } from '../dominio/formato-guardado.js';

const copia = (formato: FormatoGuardado) => FormatoGuardado.reconstruir(formato.instantanea());

/** Guarda los formatos de cheque en memoria y responde tanto de repositorio como de consultas. */
export class FormatosDeChequeEnMemoria implements RepositorioFormatosDeCheque, ConsultasFormatosDeCheque {
  private readonly registros = new Map<string, FormatoGuardado>();
  /** Cuántas chequeras dan por usar cada formato las pruebas; lo que falte, ninguna. */
  readonly usos = new Map<string, number>();

  async buscar(id: FormatoGuardadoId): Promise<FormatoGuardado | null> {
    const guardado = this.registros.get(id.valor);
    return guardado ? copia(guardado) : null;
  }

  async agregar(formato: FormatoGuardado): Promise<void> {
    this.registros.set(formato.id.valor, copia(formato));
  }

  async guardar(formato: FormatoGuardado): Promise<void> {
    this.registros.set(formato.id.valor, copia(formato));
  }

  async eliminar(id: FormatoGuardadoId): Promise<void> {
    this.registros.delete(id.valor);
  }

  async listar(): Promise<FormatoDeChequeDto[]> {
    return [...this.registros.values()].map((f) => this.aDto(f)).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async obtener(formatoId: string): Promise<FormatoDeChequeDto> {
    const formato = this.registros.get(formatoId);
    if (!formato) throw new RecursoNoEncontrado('El formato de cheque');
    return this.aDto(formato);
  }

  private aDto(formato: FormatoGuardado): FormatoDeChequeDto {
    const { id, cuentaId: _cuentaId, probadoEn, ...datos } = formato.instantanea();
    return {
      ...datos,
      id: id.valor,
      probadoEn: probadoEn?.toISOString() ?? null,
      chequerasQueLoUsan: this.usos.get(id.valor) ?? 0,
    };
  }
}

/** Un lugar de emisión fijo. */
export class LugarDeEmisionFijo implements LugarDeEmision {
  constructor(private readonly lugar = 'Guatemala') {}

  async de(_operador: Operador): Promise<string> {
    return this.lugar;
  }
}
