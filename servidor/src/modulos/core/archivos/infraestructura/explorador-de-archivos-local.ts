import { lstat, readdir, unlink } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import type { ExploradorDeArchivos } from '../aplicacion/puertos/depuracion-de-archivos.js';

/**
 * Recorre la carpeta de archivos del disco local. Nunca sigue enlaces simbólicos (ni de archivos ni de
 * carpetas), nunca sale de la raíz y nunca borra carpetas.
 */
export class ExploradorDeArchivosLocal implements ExploradorDeArchivos {
  private readonly raiz: string;

  constructor(raiz: string) {
    this.raiz = resolve(raiz);
  }

  async *listarModificadosAntesDe(antesDe: Date): AsyncIterable<string> {
    yield* this.recorrer(this.raiz, antesDe);
  }

  async borrar(ruta: string): Promise<void> {
    const destino = this.resolverDentroDeLaRaiz(ruta);
    if (!(await lstat(destino)).isFile()) throw new Error(`No es un archivo normal: ${ruta}`);
    await unlink(destino);
  }

  private async *recorrer(carpeta: string, antesDe: Date): AsyncGenerator<string> {
    const entradas = await readdir(carpeta, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    for (const entrada of entradas) {
      const ruta = join(carpeta, entrada.name);
      if (entrada.isDirectory()) yield* this.recorrer(ruta, antesDe);
      else if (entrada.isFile() && (await lstat(ruta)).mtime < antesDe) yield this.relativa(ruta);
    }
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
