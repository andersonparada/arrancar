import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { CuentaDto } from '../aplicacion/dto/cuenta.dto.js';
import type { ConsultasCuentas } from '../aplicacion/puertos/consultas-cuentas.js';
import type { RepositorioCuentas } from '../aplicacion/puertos/repositorio-cuentas.js';
import type { Cuenta, CuentaId } from '../dominio/cuenta.js';

/** Guarda las cuentas en memoria y responde tanto de repositorio como de consultas. */
export class CuentasEnMemoria implements RepositorioCuentas, ConsultasCuentas {
  private readonly registros = new Map<string, Cuenta>();

  async buscar(id: CuentaId): Promise<Cuenta | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async buscarPorCodigo(codigo: string): Promise<Cuenta | null> {
    return [...this.registros.values()].find((cuenta) => cuenta.codigo === codigo) ?? null;
  }

  async buscarParaCambiar(id: CuentaId): Promise<Cuenta | null> {
    return this.buscar(id);
  }

  async buscarPorCodigoParaCompartir(codigo: string): Promise<Cuenta | null> {
    return this.buscarPorCodigo(codigo);
  }

  async tieneHijas(id: CuentaId): Promise<boolean> {
    return [...this.registros.values()].some((cuenta) => cuenta.instantanea().padreId?.valor === id.valor);
  }

  /** Los dobles de prueba de enlaces avisan aquí qué cuentas tienen enlaces. */
  readonly conEnlaces = new Set<string>();

  async tieneEnlaces(id: CuentaId): Promise<boolean> {
    return this.conEnlaces.has(id.valor);
  }

  async hayCuentas(): Promise<boolean> {
    return this.registros.size > 0;
  }

  async agregar(cuenta: Cuenta): Promise<void> {
    this.registros.set(cuenta.id.valor, cuenta);
  }

  async guardar(cuenta: Cuenta): Promise<void> {
    this.registros.set(cuenta.id.valor, cuenta);
  }

  async eliminar(cuenta: Cuenta): Promise<void> {
    this.registros.delete(cuenta.id.valor);
  }

  async listar(): Promise<CuentaDto[]> {
    const porCodigo = (a: CuentaDto, b: CuentaDto) => (a.codigo < b.codigo ? -1 : a.codigo > b.codigo ? 1 : 0);
    return [...this.registros.values()].map((cuenta) => this.aDto(cuenta)).sort(porCodigo);
  }

  async obtener(cuentaId: string): Promise<CuentaDto> {
    const cuenta = this.registros.get(cuentaId);
    if (!cuenta) throw new RecursoNoEncontrado('La cuenta');
    return this.aDto(cuenta);
  }

  private aDto(cuenta: Cuenta): CuentaDto {
    const { id, empresaId, padreId, ...datos } = cuenta.instantanea();
    const padre = padreId ? this.registros.get(padreId.valor) : undefined;
    return { ...datos, id: id.valor, padreId: padreId?.valor ?? null, padreCodigo: padre?.codigo ?? null };
  }
}
