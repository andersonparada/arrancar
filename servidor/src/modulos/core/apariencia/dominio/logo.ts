import { DatoInvalido } from '../../compartido/dominio/errores.js';

const FORMATOS_DE_LOGO = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'];

/** El logo de la instalación es uno solo: subir otro lo reemplaza. */
export const RUTA_DEL_LOGO = 'instalacion/logo.png';

export class FormatoDeLogoNoAceptado extends DatoInvalido {
  readonly codigo = 'formato_de_logo_no_aceptado';

  constructor() {
    super('El logo debe ser una imagen SVG, PNG, JPG o WebP.');
  }
}

export class LogoIlegible extends DatoInvalido {
  readonly codigo = 'logo_ilegible';

  constructor() {
    super('La imagen está dañada o no se puede leer.');
  }
}

/** @throws FormatoDeLogoNoAceptado si el tipo no es una imagen que se pueda convertir en logo. */
export function exigirFormatoDeLogo(tipoMime: string): void {
  if (!FORMATOS_DE_LOGO.includes(tipoMime)) throw new FormatoDeLogoNoAceptado();
}

/** Cada logo nuevo lleva otra versión en su dirección, así el navegador no muestra el anterior. */
export function nuevaVersionDeLogo(fecha: Date): string {
  return fecha.getTime().toString(36);
}

export function direccionDelLogo(version: string | null): string | null {
  return version ? `/api/apariencia/logo?v=${version}` : null;
}
