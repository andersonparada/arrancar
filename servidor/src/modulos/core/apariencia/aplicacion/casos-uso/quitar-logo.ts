import type { Almacenamiento } from '../../../compartido/aplicacion/almacenamiento.js';
import { RUTA_DEL_LOGO } from '../../dominio/logo.js';
import { leerApariencia, type AparienciaDto } from '../dto/apariencia.dto.js';
import type { AjustesDeApariencia } from '../puertos/ajustes-de-apariencia.js';

interface Dependencias {
  ajustes: AjustesDeApariencia;
  almacenamiento: Almacenamiento;
}

/** Vuelve al logo de Arrancar. */
export class QuitarLogo {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(): Promise<AparienciaDto> {
    const { ajustes, almacenamiento } = this.dependencias;
    await almacenamiento.eliminar(RUTA_DEL_LOGO);
    await ajustes.restablecer(['versionLogo']);
    return leerApariencia(ajustes);
  }
}
