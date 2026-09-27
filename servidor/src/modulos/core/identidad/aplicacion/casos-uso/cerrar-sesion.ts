import type { RepositorioSesiones, TokensDeSesion } from '../puertos/repositorio-sesiones.js';

interface Dependencias {
  sesiones: RepositorioSesiones;
  tokens: TokensDeSesion;
}

export class CerrarSesion {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(token: string): Promise<void> {
    const { sesiones, tokens } = this.dependencias;
    return sesiones.cerrar(tokens.huellaDe(token));
  }
}
