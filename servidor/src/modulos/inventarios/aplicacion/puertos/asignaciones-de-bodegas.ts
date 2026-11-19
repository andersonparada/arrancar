import type { MiembroDeLaEmpresa } from '../dto/accesos-a-bodegas.dto.js';

/** Un acceso: el usuario puede usar la bodega. */
export interface AsignacionDeBodega {
  usuarioId: string;
  bodegaId: string;
}

/**
 * Lecturas y escrituras de `inventarios.accesos_a_bodegas` para la ventana de accesos.
 * Solo se usan con el operador «para asignar» (ver `operadorParaAsignar`).
 */
export interface AsignacionesDeBodegas {
  /** Los usuarios que trabajan en la empresa del operador, ordenados por usuario. */
  miembros(): Promise<MiembroDeLaEmpresa[]>;
  /** `null` si el usuario no trabaja en la empresa del operador. */
  miembro(usuarioId: string): Promise<MiembroDeLaEmpresa | null>;
  /** Todos los accesos de la empresa. */
  todas(): Promise<AsignacionDeBodega[]>;
  bodegaIdsDelUsuario(usuarioId: string): Promise<string[]>;
  asignar(asignacion: AsignacionDeBodega): Promise<void>;
  quitar(asignacion: AsignacionDeBodega): Promise<void>;
}
