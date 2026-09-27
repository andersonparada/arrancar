import type { UsuarioSesion } from '../../../compartido/aplicacion/contexto-de-sesion.js';

/** Sesión sin vencer de un usuario que sigue activo. */
export interface SesionVigente {
  sesionId: string;
  empresaActivaId: string | null;
  expiraEn: Date;
  usuario: UsuarioSesion;
}

export interface NuevaSesion {
  /** Solo se guarda la huella del token; el token en claro viaja en la cookie. */
  huella: string;
  usuarioId: string;
  direccionIp: string | null;
  agenteUsuario: string | null;
  expiraEn: Date;
}

export interface RepositorioSesiones {
  abrir(sesion: NuevaSesion): Promise<void>;
  buscarVigente(huella: string): Promise<SesionVigente | null>;
  fijarEmpresaActiva(sesionId: string, empresaId: string): Promise<void>;
  extender(sesionId: string, expiraEn: Date): Promise<void>;
  cerrar(huella: string): Promise<void>;
  cerrarVencidas(): Promise<void>;
}

/** Tokens de sesión aleatorios y la huella con que se buscan en la base. */
export interface TokensDeSesion {
  nuevo(): string;
  huellaDe(token: string): string;
}
