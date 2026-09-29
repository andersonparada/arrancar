import type { MiembroDeLaEmpresa } from '../dto/accesos-a-localidades.dto.js';

/** Un acceso: el usuario puede usar la localidad. */
export interface AsignacionDeLocalidad {
  usuarioId: string;
  localidadId: string;
}

/**
 * Lecturas y escrituras de `empresas.accesos_a_localidades` para la ventana de accesos.
 * Solo se usan con el operador «para asignar» (ver `operadorParaAsignar`).
 */
export interface AsignacionesDeLocalidades {
  /** Los usuarios que trabajan en la empresa del operador, ordenados por usuario. */
  miembros(): Promise<MiembroDeLaEmpresa[]>;
  /** `null` si el usuario no trabaja en la empresa del operador. */
  miembro(usuarioId: string): Promise<MiembroDeLaEmpresa | null>;
  /** Todos los accesos de la empresa. */
  todas(): Promise<AsignacionDeLocalidad[]>;
  localidadIdsDelUsuario(usuarioId: string): Promise<string[]>;
  asignar(asignacion: AsignacionDeLocalidad): Promise<void>;
  quitar(asignacion: AsignacionDeLocalidad): Promise<void>;
}
