import { leerApariencia, type AparienciaDto, type DatosDeApariencia } from '../dto/apariencia.dto.js';
import type { AjustesDeApariencia } from '../puertos/ajustes-de-apariencia.js';

/** Nombre y colores de la instalación; son los mismos para todas las cuentas del servidor. */
export class CambiarApariencia {
  constructor(private readonly dependencias: { ajustes: AjustesDeApariencia }) {}

  async ejecutar(datos: DatosDeApariencia, usuarioId: string): Promise<AparienciaDto> {
    const { ajustes } = this.dependencias;
    await ajustes.guardar(datos, usuarioId);
    return leerApariencia(ajustes);
  }
}
