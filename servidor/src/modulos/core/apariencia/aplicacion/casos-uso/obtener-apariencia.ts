import { leerApariencia, type AparienciaDto } from '../dto/apariencia.dto.js';
import type { AjustesDeApariencia } from '../puertos/ajustes-de-apariencia.js';

/** Es pública: la pantalla de inicio de sesión ya muestra los colores y el logo. */
export class ObtenerApariencia {
  constructor(private readonly dependencias: { ajustes: AjustesDeApariencia }) {}

  ejecutar(): Promise<AparienciaDto> {
    return leerApariencia(this.dependencias.ajustes);
  }
}
