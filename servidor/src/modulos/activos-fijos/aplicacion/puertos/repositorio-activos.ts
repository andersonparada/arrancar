import type { Activo, ActivoId } from '../../dominio/activo.js';

/** Guarda y recupera los activos para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioActivos {
  buscar(id: ActivoId): Promise<Activo | null>;
  /** Agrega el activo y la primera fila de su historial de traslados (el alta), con su ubicación inicial. */
  agregar(activo: Activo): Promise<void>;
  guardar(activo: Activo): Promise<void>;
  /** Elimina el activo y su fila de alta. */
  eliminar(activo: Activo): Promise<void>;
  existeCodigo(codigo: string): Promise<boolean>;
  tieneComponentes(id: ActivoId): Promise<boolean>;
  /** Si tiene traslados además del alta (y, con los pasos siguientes, costos, cuotas o bajas). */
  tieneMovimientos(id: ActivoId): Promise<boolean>;
}
