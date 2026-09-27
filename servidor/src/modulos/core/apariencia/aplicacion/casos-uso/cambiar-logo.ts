import type { Almacenamiento } from '../../../compartido/aplicacion/almacenamiento.js';
import type { ImagenSubida } from '../../../compartido/aplicacion/imagen-subida.js';
import { exigirFormatoDeLogo, nuevaVersionDeLogo, RUTA_DEL_LOGO } from '../../dominio/logo.js';
import { leerApariencia, type AparienciaDto } from '../dto/apariencia.dto.js';
import type { AjustesDeApariencia } from '../puertos/ajustes-de-apariencia.js';
import type { ConvertidorDeLogo } from '../puertos/convertidor-de-logo.js';

interface Dependencias {
  ajustes: AjustesDeApariencia;
  almacenamiento: Almacenamiento;
  convertidor: ConvertidorDeLogo;
}

export class CambiarLogo {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws FormatoDeLogoNoAceptado o LogoIlegible si no es una imagen válida. */
  async ejecutar(imagen: ImagenSubida, usuarioId: string): Promise<AparienciaDto> {
    exigirFormatoDeLogo(imagen.tipoMime);
    const { ajustes, almacenamiento, convertidor } = this.dependencias;
    await almacenamiento.guardar(RUTA_DEL_LOGO, await convertidor.aPngCuadrado(imagen.contenido));
    await ajustes.guardar({ versionLogo: nuevaVersionDeLogo(new Date()) }, usuarioId);
    return leerApariencia(ajustes);
  }
}
