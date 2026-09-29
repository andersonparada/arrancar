import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  FormatoDeImagenNoAceptado,
  FotoHeicNoAceptada,
  ImagenDemasiadoGrande,
  ImagenIlegible,
} from '../dominio/imagen.js';
import { OptimizadorSharp } from './optimizador-sharp.js';

const MEDIDAS = { original: { ladoMaximo: 1600, calidad: 80 }, miniatura: { ladoMaximo: 400, calidad: 70 } };
const optimizador = new OptimizadorSharp();
const fondo = { create: { width: 64, height: 48, channels: 3 as const, background: '#1f4d2c' } };

const optimizar = (contenido: Buffer) => optimizador.optimizar(contenido, MEDIDAS);

describe('optimizador de fotos', () => {
  it('saca la foto y la miniatura de una sola lectura', async () => {
    const png = await sharp({ create: { ...fondo.create, width: 2000, height: 1000 } })
      .png()
      .toBuffer();

    const { original, miniatura } = await optimizar(png);

    expect([original.ancho, original.alto]).toEqual([1600, 800]);
    expect([miniatura.ancho, miniatura.alto]).toEqual([400, 200]);
    expect((await sharp(original.contenido).metadata()).format).toBe('webp');
  });

  it('rechaza por su contenido un SVG, aunque lo presenten como PNG', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
    );

    await expect(optimizar(svg)).rejects.toThrow(FormatoDeImagenNoAceptado);
  });

  it.each(['gif', 'tiff', 'avif'] as const)('rechaza el formato %s', async (formato) => {
    const contenido = await sharp(fondo).toFormat(formato).toBuffer();

    await expect(optimizar(contenido)).rejects.toThrow(FormatoDeImagenNoAceptado);
  });

  it('rechaza una foto HEIC con la ayuda para convertirla', async () => {
    const cabecera = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(16)]);

    await expect(optimizar(cabecera)).rejects.toThrow(FotoHeicNoAceptada);
    await expect(optimizar(cabecera)).rejects.toThrow(/Más compatible/);
  });

  it('rechaza una imagen de más de 100 megapíxeles sin decodificarla', async () => {
    const enorme = await sharp({
      create: { width: 20000, height: 20000, channels: 3, background: '#808080' },
      limitInputPixels: false,
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const antes = process.memoryUsage().rss;

    await expect(optimizar(enorme)).rejects.toThrow(ImagenDemasiadoGrande);
    expect(process.memoryUsage().rss - antes).toBeLessThan(500 * 1024 * 1024);
  });

  it('rechaza un archivo dañado', async () => {
    const dañado = (await sharp(fondo).png().toBuffer()).subarray(0, 60);

    await expect(optimizar(dañado)).rejects.toThrow(ImagenIlegible);
  });

  it('la salida no trae el EXIF ni el GPS de la foto original', async () => {
    const conGps = await sharp(fondo)
      .jpeg()
      .withExif({ IFD0: { Copyright: 'Rancho' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '14/1 38/1 0/1' } })
      .toBuffer();
    expect((await sharp(conGps).metadata()).exif).toBeDefined();

    const { original, miniatura } = await optimizar(conGps);

    expect((await sharp(original.contenido).metadata()).exif).toBeUndefined();
    expect((await sharp(miniatura.contenido).metadata()).exif).toBeUndefined();
  });

  it('la salida no arrastra un zip pegado al final del PNG', async () => {
    const zip = Buffer.concat([Buffer.from('PK\x03\x04'), Buffer.from('contenido escondido '.repeat(20))]);
    const png = Buffer.concat([await sharp(fondo).png().toBuffer(), zip]);

    const { original } = await optimizar(png);

    expect(original.contenido.includes(Buffer.from('PK\x03\x04'))).toBe(false);
    expect(original.contenido.includes(Buffer.from('contenido escondido'))).toBe(false);
  });
});
