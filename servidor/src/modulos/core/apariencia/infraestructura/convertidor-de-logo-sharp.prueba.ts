import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { LogoIlegible } from '../dominio/logo.js';
import { ConvertidorDeLogoSharp } from './convertidor-de-logo-sharp.js';

const convertidor = new ConvertidorDeLogoSharp();

describe('convertidor de logo', () => {
  it('convierte un logo normal en un PNG cuadrado', async () => {
    const png = await sharp({ create: { width: 100, height: 40, channels: 3, background: '#1f4d2c' } })
      .png()
      .toBuffer();

    const logo = await sharp(await convertidor.aPngCuadrado(png)).metadata();

    expect([logo.width, logo.height]).toEqual([512, 512]);
  });

  it('rechaza una imagen de más de 100 megapíxeles', async () => {
    const enorme = await sharp({
      create: { width: 20000, height: 20000, channels: 3, background: '#808080' },
      limitInputPixels: false,
    })
      .png({ compressionLevel: 9 })
      .toBuffer();

    await expect(convertidor.aPngCuadrado(enorme)).rejects.toThrow(LogoIlegible);
  });
});
