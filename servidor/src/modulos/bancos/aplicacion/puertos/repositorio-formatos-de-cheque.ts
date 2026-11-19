import type { FormatoGuardado, FormatoGuardadoId } from '../../dominio/formato-guardado.js';

/** Guarda y recupera los formatos de cheque. La seguridad por cuenta (RLS) limita lo que se ve. */
export interface RepositorioFormatosDeCheque {
  buscar(id: FormatoGuardadoId): Promise<FormatoGuardado | null>;
  agregar(formato: FormatoGuardado): Promise<void>;
  guardar(formato: FormatoGuardado): Promise<void>;
  eliminar(id: FormatoGuardadoId): Promise<void>;
}
