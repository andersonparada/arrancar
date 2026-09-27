import type { CuentaId, Empresa, EmpresaId } from '../../dominio/empresa.js';

/** Guarda y recupera empresas completas para modificarlas. */
export interface RepositorioEmpresas {
  buscarEnCuenta(id: EmpresaId, cuentaId: CuentaId): Promise<Empresa | null>;
  agregar(empresa: Empresa): Promise<void>;
  actualizar(empresa: Empresa): Promise<void>;
}
