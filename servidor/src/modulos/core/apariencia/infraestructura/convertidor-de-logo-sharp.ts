import sharp from 'sharp';
import { LIMITE_DE_PIXELES } from '../../compartido/dominio/limites-de-imagen.js';
import type { ConvertidorDeLogo } from '../aplicacion/puertos/convertidor-de-logo.js';
import { LogoIlegible } from '../dominio/logo.js';

const LADO_DEL_LOGO = 512;
const TRANSPARENTE = { r: 0, g: 0, b: 0, alpha: 0 };

/** La densidad alta hace que un logo SVG no se vea borroso al convertirlo. */
export class ConvertidorDeLogoSharp implements ConvertidorDeLogo {
  async aPngCuadrado(contenido: Buffer): Promise<Buffer> {
    try {
      return await sharp(contenido, { failOn: 'error', density: 300, limitInputPixels: LIMITE_DE_PIXELES })
        .resize({ width: LADO_DEL_LOGO, height: LADO_DEL_LOGO, fit: 'contain', background: TRANSPARENTE })
        .png()
        .toBuffer();
    } catch {
      throw new LogoIlegible();
    }
  }
}
