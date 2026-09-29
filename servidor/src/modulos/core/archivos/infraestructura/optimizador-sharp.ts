import sharp, { type Sharp } from 'sharp';
import { LIMITE_DE_PIXELES } from '../../compartido/dominio/limites-de-imagen.js';
import { Semaforo } from '../../compartido/infraestructura/semaforo.js';
import type {
  ImagenesOptimizadas,
  ImagenOptimizada,
  MedidaDeImagen,
  MedidasDeImagen,
  OptimizadorDeImagenes,
} from '../aplicacion/puertos/optimizador-de-imagenes.js';
import {
  esHeicPorCabecera,
  exigirFormatoDeFoto,
  exigirTamanoDeFoto,
  FotoHeicNoAceptada,
  ImagenDemasiadoGrande,
  ImagenIlegible,
} from '../dominio/imagen.js';

const TRABAJOS_A_LA_VEZ = 2;
/** Decodificar imágenes grandes gasta mucha memoria: libvips usa un solo hilo por trabajo. */
sharp.concurrency(1);

/**
 * Lee la imagen una sola vez (formato real, tamaño y decodificación) y de ella saca la
 * foto y la miniatura. Además de reducirla, corrige la orientación con que la guardó la
 * cámara. La salida es un WebP nuevo: no arrastra EXIF, GPS ni datos pegados al final.
 */
export class OptimizadorSharp implements OptimizadorDeImagenes {
  constructor(private readonly semaforo = new Semaforo(TRABAJOS_A_LA_VEZ)) {}

  optimizar(contenido: Buffer, medidas: MedidasDeImagen): Promise<ImagenesOptimizadas> {
    return this.semaforo.ejecutar(() => this.procesar(contenido, medidas));
  }

  private async procesar(contenido: Buffer, medidas: MedidasDeImagen): Promise<ImagenesOptimizadas> {
    if (esHeicPorCabecera(contenido)) throw new FotoHeicNoAceptada();
    try {
      const entrada = sharp(contenido, { limitInputPixels: LIMITE_DE_PIXELES, failOn: 'error' });
      const { format, compression, width, height } = await entrada.metadata();
      exigirFormatoDeFoto(format, compression);
      exigirTamanoDeFoto(width ?? 0, height ?? 0);
      const [original, miniatura] = await Promise.all([
        reducir(entrada.clone(), medidas.original),
        reducir(entrada.clone(), medidas.miniatura),
      ]);
      return { original, miniatura };
    } catch (error) {
      throw traducir(error);
    }
  }
}

function reducir(imagen: Sharp, { ladoMaximo, calidad }: MedidaDeImagen): Promise<ImagenOptimizada> {
  return imagen
    .rotate()
    .resize({ width: ladoMaximo, height: ladoMaximo, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: calidad })
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => ({ contenido: data, ancho: info.width, alto: info.height }));
}

/** Los errores del dominio pasan tal cual; lo demás que falle sharp es una imagen ilegible. */
function traducir(error: unknown): Error {
  if (error instanceof Error && 'codigo' in error) return error;
  const pasaDelLimite = error instanceof Error && /pixel limit/i.test(error.message);
  return pasaDelLimite ? new ImagenDemasiadoGrande() : new ImagenIlegible();
}
