import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { DatosFiscalesDeEmpresa } from '../../dominio/datos-fiscales-de-empresa.js';
import type { DatosFiscalesDeProveedor } from '../../dominio/datos-fiscales-de-proveedor.js';

/** Los datos fiscales de la empresa activa de la transacción (una fila por empresa). */
export interface RepositorioDeDatosFiscalesDeEmpresa {
  /** `null` si nunca se guardaron: valen los valores por omisión. */
  buscar(empresaId: string): Promise<DatosFiscalesDeEmpresa | null>;
  /** Crea la fila o cambia la que había. */
  guardar(empresaId: string, datos: DatosFiscalesDeEmpresa): Promise<void>;
}

/** Los datos fiscales de los proveedores de la cuenta de la transacción (una fila por proveedor). */
export interface RepositorioDeDatosFiscalesDeProveedor {
  /** `null` si nunca se guardaron: valen los valores por omisión. */
  buscar(proveedorId: string): Promise<DatosFiscalesDeProveedor | null>;
  /** Crea la fila o cambia la que había. */
  guardar(proveedorId: string, datos: DatosFiscalesDeProveedor): Promise<void>;
  /** Si el proveedor existe en la cuenta de la transacción. */
  existe(proveedorId: string): Promise<boolean>;
}

/** Quién puede trabajar con los datos de una empresa: de la cuenta del operador y a la que tiene acceso. */
export interface AccesoAEmpresas {
  /** @throws RecursoNoEncontrado si la empresa no es de la cuenta o el operador no tiene acceso a ella. */
  exigirAcceso(operador: Operador, empresaId: string): Promise<void>;
}
