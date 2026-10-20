import type { DteRecibido, DteRecibidoId } from '../../dominio/dte-recibido.js';

/** Guarda y recupera las filas de la bandeja de DTE recibidos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioDeDteRecibidos {
  buscar(id: DteRecibidoId): Promise<DteRecibido | null>;
  /** La fila de la empresa con esa autorización FEL, si la hay. */
  buscarPorAutorizacion(autorizacionFel: string): Promise<DteRecibido | null>;
  /** La fila enlazada con un documento registrado, si la hay. */
  buscarPorDocumento(documentoId: string): Promise<DteRecibido | null>;
  agregar(dte: DteRecibido): Promise<void>;
  /** Guarda el estado y el borrador; los datos de la SAT no se tocan aquí. */
  guardar(dte: DteRecibido): Promise<void>;
}
