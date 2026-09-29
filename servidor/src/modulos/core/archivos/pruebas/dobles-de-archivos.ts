import { FotoNoValida, type VerificadorDeFotos } from '../../compartido/aplicacion/verificador-de-fotos.js';
import type {
  ImagenesOptimizadas,
  MedidasDeImagen,
  OptimizadorDeImagenes,
} from '../aplicacion/puertos/optimizador-de-imagenes.js';
import { FormatoDeImagenNoAceptado } from '../dominio/imagen.js';
import type { InspectorDePdf, PdfInspeccionado } from '../aplicacion/puertos/inspector-de-pdf.js';
import type { ArchivoGuardado, NuevoArchivo, RepositorioArchivos } from '../aplicacion/puertos/repositorio-archivos.js';

/** Devuelve la imagen como si ya midiera el lado máximo pedido. */
export class OptimizadorFalso implements OptimizadorDeImagenes {
  async optimizar(_contenido: Buffer, { original, miniatura }: MedidasDeImagen): Promise<ImagenesOptimizadas> {
    const hecha = ({ ladoMaximo }: { ladoMaximo: number }) => ({
      contenido: Buffer.from(`imagen de ${ladoMaximo}`),
      ancho: ladoMaximo,
      alto: ladoMaximo / 2,
    });
    return { original: hecha(original), miniatura: hecha(miniatura) };
  }
}

/** Rechaza todo como lo haría el optimizador real con un archivo que no es una foto aceptada. */
export class OptimizadorQueRechaza implements OptimizadorDeImagenes {
  async optimizar(): Promise<ImagenesOptimizadas> {
    throw new FormatoDeImagenNoAceptado();
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

  async buscarImagenLibre(archivoId: string): Promise<ArchivoGuardado | null> {
    const archivo = this.porId.get(archivoId);
    return archivo?.clase === 'imagen' && archivo.recursoDueno === null ? archivo : null;
  }

  async buscarDocumento(archivoId: string, recursoDueno: string): Promise<ArchivoGuardado | null> {
    const archivo = this.porId.get(archivoId);
    return archivo?.clase === 'documento' && archivo.recursoDueno === recursoDueno ? archivo : null;
  }

  async eliminar(archivoId: string): Promise<void> {
    this.porId.delete(archivoId);
  }
}

/** Acepta las fotos que se le indiquen; rechaza el resto como lo haría el verificador real. */
export class VerificadorDeFotosEnMemoria implements VerificadorDeFotos {
  readonly validas = new Set<string>();

  async exigir(archivoId: string | null): Promise<void> {
    if (archivoId !== null && !this.validas.has(archivoId)) throw new FotoNoValida();
  }
}

/** Devuelve el PDF tal cual con las páginas indicadas, o lanza el error que se le programe. */
export class InspectorDePdfFalso implements InspectorDePdf {
  readonly inspeccionados: Buffer[] = [];
  /** Si se indica, se lanza en vez de aceptar. */
  error: Error | null = null;
  paginas = 3;

  async inspeccionar(contenido: Buffer): Promise<PdfInspeccionado> {
    this.inspeccionados.push(contenido);
    if (this.error) throw this.error;
    return { contenido: Buffer.concat([contenido, Buffer.from('\n%limpio')]), paginas: this.paginas };
  }
}
