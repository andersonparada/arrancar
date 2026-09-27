import { leerApariencia, type AparienciaDto } from '../dto/apariencia.dto.js';
import type { AjustesDeApariencia } from '../puertos/ajustes-de-apariencia.js';

/** Vuelve al nombre y los colores de Arrancar; el logo no cambia. */
export class RestablecerApariencia {
  constructor(private readonly dependencias: { ajustes: AjustesDeApariencia }) {}

  async ejecutar(): Promise<AparienciaDto> {
    const { ajustes } = this.dependencias;
    await ajustes.restablecer(['nombreAplicacion', 'colorPrincipal', 'colorAcento']);
    return leerApariencia(ajustes);
  }
}
