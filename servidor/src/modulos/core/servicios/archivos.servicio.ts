import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import sharp from 'sharp';
import { almacenamiento } from '../almacenamiento/almacenamiento.js';
import { ejecutarEnEmpresa, type ContextoEmpresa } from '../base-datos/contexto-empresa.js';
import { ErrorNoEncontrado, ErrorSolicitudInvalida } from '../errores/errores.js';
import { archivosRepositorio, type Archivo } from '../repositorios/archivos.repositorio.js';

export const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

const LADO_MAXIMO_ORIGINAL = 1600;
const LADO_MAXIMO_MINIATURA = 400;

export type VarianteImagen = 'original' | 'miniatura';

export interface ImagenSubida {
  contenido: Buffer;
  nombreOriginal: string | null;
  tipoMime: string;
}

export interface ArchivoPublico {
  id: string;
  ancho: number;
  alto: number;
  tamanoBytes: number;
}

/** Reduce la imagen, corrige la orientación de la cámara y la convierte a WebP. */
async function optimizarImagen(contenido: Buffer, ladoMaximo: number, calidad: number) {
  const { data, info } = await sharp(contenido, { failOn: 'error' })
    .rotate()
    .resize({ width: ladoMaximo, height: ladoMaximo, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: calidad })
    .toBuffer({ resolveWithObject: true });
  return { data, ancho: info.width, alto: info.height };
}

function construirRutaBase(empresaId: string): string {
  const hoy = new Date();
  const mes = String(hoy.getUTCMonth() + 1).padStart(2, '0');
  return `${empresaId}/${hoy.getUTCFullYear()}/${mes}/${randomUUID()}`;
}

export const archivosServicio = {
  /**
   * Guarda una foto de la empresa en dos tamaños (normal y miniatura).
   * Las fotos de celular (4–8 MB) quedan en unos 150–300 KB.
   * @throws ErrorSolicitudInvalida si el archivo no es una imagen válida.
   */
  async subirImagen(contexto: ContextoEmpresa, imagen: ImagenSubida): Promise<ArchivoPublico> {
    if (!TIPOS_IMAGEN_PERMITIDOS.includes(imagen.tipoMime)) {
      throw new ErrorSolicitudInvalida('Solo se permiten imágenes JPG, PNG, WebP, AVIF o GIF.');
    }

    let original: Awaited<ReturnType<typeof optimizarImagen>>;
    let miniatura: Awaited<ReturnType<typeof optimizarImagen>>;
    try {
      [original, miniatura] = await Promise.all([
        optimizarImagen(imagen.contenido, LADO_MAXIMO_ORIGINAL, 80),
        optimizarImagen(imagen.contenido, LADO_MAXIMO_MINIATURA, 70),
      ]);
    } catch {
      throw new ErrorSolicitudInvalida('La imagen está dañada o no se puede leer.');
    }

    const rutaBase = construirRutaBase(contexto.empresaId);
    const rutaOriginal = `${rutaBase}.webp`;
    const rutaMiniatura = `${rutaBase}_min.webp`;
    await almacenamiento.guardar(rutaOriginal, original.data);
    await almacenamiento.guardar(rutaMiniatura, miniatura.data);

    const archivo = await ejecutarEnEmpresa(contexto, (tx) =>
      archivosRepositorio.crear(tx, {
        empresaId: contexto.empresaId,
        rutaOriginal,
        rutaMiniatura,
        tipoMime: 'image/webp',
        tamanoBytes: original.data.length,
        ancho: original.ancho,
        alto: original.alto,
        nombreOriginal: imagen.nombreOriginal?.slice(0, 200) ?? null,
        subidoPor: contexto.usuarioId,
      }),
    );
    return { id: archivo.id, ancho: archivo.ancho, alto: archivo.alto, tamanoBytes: archivo.tamanoBytes };
  },

  /**
   * Abre el contenido de un archivo de la empresa.
   * @throws ErrorNoEncontrado si no existe o pertenece a otra empresa.
   */
  async abrir(
    contexto: ContextoEmpresa,
    archivoId: string,
    variante: VarianteImagen,
  ): Promise<{ archivo: Archivo; contenido: Readable }> {
    const archivo = await ejecutarEnEmpresa(contexto, (tx) => archivosRepositorio.buscarPorId(tx, archivoId));
    if (!archivo) throw new ErrorNoEncontrado('El archivo');

    const ruta = variante === 'miniatura' ? archivo.rutaMiniatura : archivo.rutaOriginal;
    try {
      return { archivo, contenido: await almacenamiento.leer(ruta) };
    } catch {
      throw new ErrorNoEncontrado('El archivo');
    }
  },
};
