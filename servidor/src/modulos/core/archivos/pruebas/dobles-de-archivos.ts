import type {
  ImagenOptimizada,
  MedidaDeImagen,
  OptimizadorDeImagenes,
} from '../aplicacion/puertos/optimizador-de-imagenes.js';
import type { ArchivoGuardado, NuevoArchivo, RepositorioArchivos } from '../aplicacion/puertos/repositorio-archivos.js';

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
