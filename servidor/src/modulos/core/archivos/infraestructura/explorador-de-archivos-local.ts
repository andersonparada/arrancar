import { lstat, readdir, realpath, unlink } from 'node:fs/promises';
import { dirname, join, parse, relative, resolve, sep } from 'node:path';
import type { ExploradorDeArchivos } from '../aplicacion/puertos/depuracion-de-archivos.js';
import { RutasDeArchivo } from '../dominio/rutas-de-archivo.js';

/** La raíz mal configurada (`/` o la carpeta de trabajo o una de sus padres) pondría en riesgo el programa mismo. */
export class RaizDeArchivosInsegura extends Error {
  constructor(raiz: string) {
    super(`La carpeta de archivos (${raiz}) es insegura para depurar: es la raíz del disco o contiene al programa.`);
  }
}

/**
 * Recorre la carpeta de archivos del disco local. Solo toma como candidatas las rutas con la forma que
 * genera `RutasDeArchivo`; nunca sigue enlaces simbólicos, nunca sale de la raíz y nunca borra carpetas.
 * @throws RaizDeArchivosInsegura si la raíz es `/`, la carpeta de trabajo o una de sus carpetas padre.
 */
export class ExploradorDeArchivosLocal implements ExploradorDeArchivos {
  private readonly raiz: string;

  constructor(raiz: string, carpetaDeTrabajo = process.cwd()) {
    this.raiz = resolve(raiz);
    const trabajo = resolve(carpetaDeTrabajo);
    const contieneAlPrograma = trabajo === this.raiz || trabajo.startsWith(this.raiz + sep);
    if (this.raiz === parse(this.raiz).root || contieneAlPrograma) throw new RaizDeArchivosInsegura(this.raiz);
  }

  async *listarModificadosAntesDe(antesDe: Date): AsyncIterable<string> {
    yield* this.recorrer(this.raiz, antesDe);
  }

  /** Si el archivo ya no estaba, no es un error. */
  async borrar(ruta: string): Promise<void> {
    if (!RutasDeArchivo.esGenerada(ruta)) throw new Error(`Ruta que no genera la aplicación: ${ruta}`);
    const destino = this.resolverDentroDeLaRaiz(ruta);
    try {
      await this.exigirCarpetasSinEnlaces(destino, ruta);
      if (!(await lstat(destino)).isFile()) throw new Error(`No es un archivo normal: ${ruta}`);
      await unlink(destino);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  /** Cierra la ventana entre listar y borrar: una carpeta intermedia cambiada por un enlace. */
  private async exigirCarpetasSinEnlaces(destino: string, ruta: string): Promise<void> {
    const raizReal = await realpath(this.raiz);
    const carpetaReal = await realpath(dirname(destino));
    if (carpetaReal !== resolve(raizReal, dirname(ruta))) throw new Error(`La carpeta cambió: ${ruta}`);
  }

  private async *recorrer(carpeta: string, antesDe: Date): AsyncGenerator<string> {
    const entradas = await readdir(carpeta, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    for (const entrada of entradas) {
      const ruta = join(carpeta, entrada.name);
      if (entrada.isDirectory()) yield* this.recorrer(ruta, antesDe);
      else if (entrada.isFile() && (await this.esCandidato(ruta, antesDe))) yield this.relativa(ruta);
    }
  }

  private async esCandidato(ruta: string, antesDe: Date): Promise<boolean> {
    return RutasDeArchivo.esGenerada(this.relativa(ruta)) && (await lstat(ruta)).mtime < antesDe;
  }

  private relativa(ruta: string): string {
    return relative(this.raiz, ruta).split(sep).join('/');
  }

  private resolverDentroDeLaRaiz(ruta: string): string {
    const absoluta = resolve(this.raiz, ruta);
    if (!absoluta.startsWith(this.raiz + sep)) throw new Error(`Ruta de archivo no permitida: ${ruta}`);
    return absoluta;
  }
}
