export interface UsuarioSesion {
  id: string;
  usuario: string;
  nombre: string;
  esSuperacceso: boolean;
}

export interface EmpresaSesion {
  id: string;
  nombre: string;
  cuentaId: string;
  cuentaNombre: string;
}

/** Lo que el servidor sabe de quién hace la petición y con qué empresa trabaja. */
export interface ContextoDeSesion {
  sesionId: string;
  usuario: UsuarioSesion;
  empresa: EmpresaSesion | null;
  rolNombre: string | null;
  modulosActivos: ReadonlySet<string>;
  permisos: ReadonlySet<string>;
  /** Recursos con alcance que el usuario ve completos (ver `politicaPorAlcance`). */
  recursosAlcanceTotal: readonly string[];
}

export interface SesionValidada {
  contexto: ContextoDeSesion;
  /** Nuevo vencimiento si la sesión se renovó en esta petición; la cookie debe renovarse igual. */
  renovadaHasta: Date | null;
}

/** Reconoce el token de la cookie; lo implementa el contexto de identidad. */
export interface ValidadorDeSesion {
  validar(token: string): Promise<SesionValidada | null>;
}
