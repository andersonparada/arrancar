import { direccionDelLogo } from '../../dominio/logo.js';
import type { AjustesDeApariencia } from '../puertos/ajustes-de-apariencia.js';

export interface DatosDeApariencia {
  nombreAplicacion: string;
  colorPrincipal: string;
  colorAcento: string;
}

export interface AparienciaDto extends DatosDeApariencia {
  /** Dirección del logo propio con su versión, o `null` si usa el de Arrancar. */
  urlLogo: string | null;
}

/** La apariencia vigente, tal como la ve el navegador. */
export async function leerApariencia(ajustes: AjustesDeApariencia): Promise<AparienciaDto> {
  const { versionLogo, ...datos } = await ajustes.leer();
  return { ...datos, urlLogo: direccionDelLogo(versionLogo) };
}
