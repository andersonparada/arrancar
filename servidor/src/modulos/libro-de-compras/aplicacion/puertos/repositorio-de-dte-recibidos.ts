import type { DteRecibido, DteRecibidoId } from '../../dominio/dte-recibido.js';

/** Guarda y recupera las filas de la bandeja de DTE recibidos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioDeDteRecibidos {
  buscar(id: DteRecibidoId): Promise<DteRecibido | null>;
  /** Las filas con esos ids, en el orden de su fecha de emisión; las que no existen no aparecen. */
  buscarVarias(ids: readonly string[]): Promise<DteRecibido[]>;
  /** Como `buscar`, pero la fila queda bloqueada hasta el fin de la transacción (confirmar, descartar, enlazar). */
  bloquear(id: DteRecibidoId): Promise<DteRecibido | null>;
  /** La fila de la empresa con esa autorización FEL, si la hay; con `bloquear`, queda bloqueada. */
  buscarPorAutorizacion(autorizacionFel: string, bloquear?: boolean): Promise<DteRecibido | null>;
  /** La fila enlazada con un documento registrado, si la hay; con `bloquear`, queda bloqueada. */
  buscarPorDocumento(documentoId: string, bloquear?: boolean): Promise<DteRecibido | null>;
  agregar(dte: DteRecibido): Promise<void>;
  /** Pone el proveedor a las filas pendientes del NIT del emisor que aún no lo tienen. */
  asignarProveedorALasPendientes(nitEmisor: string, proveedorId: string): Promise<void>;
  /** Guarda el estado y el borrador; los datos de la SAT no se tocan aquí. */
  guardar(dte: DteRecibido): Promise<void>;
}
