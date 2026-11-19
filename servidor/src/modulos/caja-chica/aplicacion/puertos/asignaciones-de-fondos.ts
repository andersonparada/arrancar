import type { MiembroDeLaEmpresa } from '../dto/accesos-a-fondos.dto.js';

/** Un acceso: el usuario puede ver y operar el fondo. */
export interface AsignacionDeFondo {
  usuarioId: string;
  fondoId: string;
}

/** Un fondo de la empresa, con o sin acceso del usuario que mira. */
export interface FondoDeLaEmpresa {
  id: string;
  nombre: string;
  estado: 'abierto' | 'cerrado';
}

/**
 * Lecturas y escrituras de `caja_chica.accesos_a_fondos` para la ventana de accesos. Solo se usan con el operador «para
 * asignar» (ver `operadorParaAsignar`): solo así la base deja leer los fondos que el usuario no tiene asignados.
 */
export interface AsignacionesDeFondos {
  /** Los usuarios que trabajan en la empresa del operador, ordenados por usuario. */
  miembros(): Promise<MiembroDeLaEmpresa[]>;
  /** `null` si el usuario no trabaja en la empresa del operador. */
  miembro(usuarioId: string): Promise<MiembroDeLaEmpresa | null>;
  /** Todos los fondos de la empresa, también los cerrados. */
  fondos(): Promise<FondoDeLaEmpresa[]>;
  /** Todos los accesos de la empresa. */
  todas(): Promise<AsignacionDeFondo[]>;
  fondoIdsDelUsuario(usuarioId: string): Promise<string[]>;
  asignar(asignacion: AsignacionDeFondo): Promise<void>;
  quitar(asignacion: AsignacionDeFondo): Promise<void>;
}
