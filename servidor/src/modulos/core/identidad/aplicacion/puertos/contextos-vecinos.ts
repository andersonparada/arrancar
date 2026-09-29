/**
 * Lo que la sesión necesita de otros contextos del núcleo. Los implementan sus
 * piezas (autorización, configuración y bitácora); identidad no conoce su código.
 */

import type { AsignacionesDelUsuario } from '../permisos-efectivos.js';

export interface PermisosDeUsuario {
  /** Roles (con sus permisos) y permisos directos del usuario en la cuenta. */
  enCuenta(usuarioId: string, cuentaId: string): Promise<AsignacionesDelUsuario>;
}

export interface ConfiguracionPublica {
  valoresPublicos(alcance: {
    destino: { cuentaId: string; empresaId: string };
    modulosActivos: ReadonlySet<string>;
  }): Promise<Record<string, unknown>>;
}

export interface BitacoraDeSoporte {
  registrarEntrada(entrada: { usuarioId: string; empresaId: string; direccionIp: string | null }): Promise<void>;
}
