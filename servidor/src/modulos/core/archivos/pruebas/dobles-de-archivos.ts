import { Readable } from 'node:stream';
import type { Almacenamiento } from '../../compartido/aplicacion/almacenamiento.js';
import type {
  ImagenOptimizada,
  MedidaDeImagen,
  OptimizadorDeImagenes,
} from '../aplicacion/puertos/optimizador-de-imagenes.js';
import type { ArchivoGuardado, NuevoArchivo, RepositorioArchivos } from '../aplicacion/puertos/repositorio-archivos.js';

export class AlmacenamientoEnMemoria implements Almacenamiento {
  readonly contenidos = new Map<string, Buffer>();

  async guardar(ruta: string, contenido: Buffer): Promise<void> {
    this.contenidos.set(ruta, contenido);
  }

  async leer(ruta: string): Promise<Readable> {
    const contenido = this.contenidos.get(ruta);
    if (!contenido) throw new Error(`No existe ${ruta}`);
    return Readable.from(contenido);
  }

  async eliminar(ruta: string): Promise<void> {
    this.contenidos.delete(ruta);
  }
}

/** Devuelve la imagen como si ya midiera el lado máximo pedido. */
export class OptimizadorFalso implements OptimizadorDeImagenes {
  async optimizar(_contenido: Buffer, { ladoMaximo }: MedidaDeImagen): Promise<ImagenOptimizada> {
    return { contenido: Buffer.from(`imagen de ${ladoMaximo}`), ancho: ladoMaximo, alto: ladoMaximo / 2 };
  }
}

export class RepositorioArchivosEnMemoria implements RepositorioArchivos {
  readonly guardados: NuevoArchivo[] = [];
  private readonly porId = new Map<string, ArchivoGuardado>();

  async guardar(archivo: NuevoArchivo): Promise<ArchivoGuardado> {
    const guardado = { ...archivo, id: crypto.randomUUID() };
    this.guardados.push(archivo);
    this.porId.set(guardado.id, guardado);
    return guardado;
  }

  async buscar(archivoId: string): Promise<ArchivoGuardado | null> {
    return this.porId.get(archivoId) ?? null;
  }
}
