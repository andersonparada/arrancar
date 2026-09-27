import type { RepositorioSesiones } from '../puertos/repositorio-sesiones.js';

/** Borra las sesiones vencidas; el servidor lo hace cada hora. */
export class LimpiarSesionesVencidas {
  constructor(private readonly dependencias: { sesiones: RepositorioSesiones }) {}

  ejecutar(): Promise<void> {
    return this.dependencias.sesiones.cerrarVencidas();
  }
}
