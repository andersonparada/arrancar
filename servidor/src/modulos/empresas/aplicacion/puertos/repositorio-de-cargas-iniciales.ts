import type { CargaInicial } from '../../dominio/carga-inicial.js';
import type { EmpresaId } from '../../dominio/empresa.js';

/** Guarda y recupera la carga inicial de una empresa. */
export interface RepositorioDeCargasIniciales {
  /** La busca bloqueándola para cambiarla: cerrar y reabrir no se pisan con otro cambio ni con quien registra saldos. */
  buscar(empresaId: EmpresaId): Promise<CargaInicial | null>;
  /** Crea la fila la primera vez y la reemplaza después. */
  guardar(carga: CargaInicial): Promise<void>;
}
