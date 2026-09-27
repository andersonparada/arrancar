import sharp from 'sharp';
import type {
  ImagenOptimizada,
  MedidaDeImagen,
  OptimizadorDeImagenes,
} from '../aplicacion/puertos/optimizador-de-imagenes.js';
import { ImagenIlegible } from '../dominio/imagen.js';

/** Además de reducirla, corrige la orientación con que la guardó la cámara. */
export class OptimizadorSharp implements OptimizadorDeImagenes {
  async optimizar(contenido: Buffer, { ladoMaximo, calidad }: MedidaDeImagen): Promise<ImagenOptimizada> {
    try {
      const { data, info } = await sharp(contenido, { failOn: 'error' })
        .rotate()
        .resize({ width: ladoMaximo, height: ladoMaximo, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: calidad })
        .toBuffer({ resolveWithObject: true });
      return { contenido: data, ancho: info.width, alto: info.height };
    } catch {
      throw new ImagenIlegible();
    }
  }
}
