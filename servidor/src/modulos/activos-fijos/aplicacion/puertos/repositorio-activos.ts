import type { Activo, ActivoId } from '../../dominio/activo.js';

/** Guarda y recupera los activos para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioActivos {
  buscar(id: ActivoId): Promise<Activo | null>;
  /** Agrega el activo y la primera fila de su historial de traslados (el alta), con su ubicación inicial. */
  agregar(activo: Activo): Promise<void>;
  /** Agrega varios activos con sus filas de alta, en tandas (una capitalización crea hasta 200). */
  agregarVarios(activos: readonly Activo[]): Promise<void>;
  /**
   * Los activos pedidos que existen, bloqueados (`for update`) en orden hasta el final de la transacción: quien suma o
   * anula costos revisa su total sin que otro lo cambie a la vez.
   */
  buscarBloqueando(ids: readonly string[]): Promise<Activo[]>;
  /** Los activos de una alta conjunta que no se han dado de baja, por código y bloqueados. */
  vigentesDeAltaConjunta(altaConjuntaId: string): Promise<Activo[]>;
  guardar(activo: Activo): Promise<void>;
  /** Pone en la fila de alta del historial de traslados la ubicación y la fecha que hoy tiene el activo (saldos iniciales corregidos). */
  actualizarAlta(activo: Activo): Promise<void>;
  /** Elimina el activo y su fila de alta. */
  eliminar(activo: Activo): Promise<void>;
  existeCodigo(codigo: string): Promise<boolean>;
  /** El id del activo con ese código (sin distinguir mayúsculas), o `null` si no hay. */
  idPorCodigo(codigo: string): Promise<string | null>;
  /** De los códigos dados, los que ya usa un activo (en mayúsculas, porque el código no distingue mayúsculas). */
  codigosUsados(codigos: readonly string[]): Promise<Set<string>>;
  tieneComponentes(id: ActivoId): Promise<boolean>;
  /** Si tiene traslados además del alta o costos vigentes de líneas del libro (y, con los pasos siguientes, cuotas o bajas). */
  tieneMovimientos(id: ActivoId): Promise<boolean>;
}
