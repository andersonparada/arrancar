import type { CuentaId } from '../../../compartido/dominio/identificador.js';
import type { Cuenta } from '../../dominio/cuenta.js';
import type { CuentaDto } from '../dto/cuenta.dto.js';

export interface RepositorioCuentas {
  buscar(id: CuentaId): Promise<Cuenta | null>;
  agregar(cuenta: Cuenta): Promise<void>;
  actualizar(cuenta: Cuenta): Promise<void>;
  /** Los que contrató; los esenciales no se guardan porque siempre están activos. */
  modulosContratados(id: CuentaId): Promise<string[]>;
  contratar(id: CuentaId, modulo: string): Promise<void>;
  dejarDeContratar(id: CuentaId, modulo: string): Promise<void>;
}

export interface ConsultasCuentas {
  /** Todas las del servidor, ordenadas por nombre, con cuántas empresas tiene cada una. */
  listar(): Promise<CuentaDto[]>;
}
