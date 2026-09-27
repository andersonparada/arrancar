import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import { configuracion } from '../../../../configuracion.js';
import type { Almacenamiento } from '../aplicacion/almacenamiento.js';

export class AlmacenamientoLocal implements Almacenamiento {
  private readonly raiz: string;

  constructor(raiz: string) {
    this.raiz = resolve(raiz);
  }

  async guardar(ruta: string, contenido: Buffer): Promise<void> {
    const destino = this.resolverRuta(ruta);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, contenido);
  }

  async leer(ruta: string): Promise<Readable> {
    const origen = this.resolverRuta(ruta);
    await stat(origen);
    return createReadStream(origen);
  }

  async eliminar(ruta: string): Promise<void> {
    await rm(this.resolverRuta(ruta), { force: true });
  }

  /** Impide que una ruta relativa se salga de la carpeta raíz. */
  private resolverRuta(ruta: string): string {
    const absoluta = resolve(this.raiz, ruta);
    if (!absoluta.startsWith(this.raiz + sep)) throw new Error(`Ruta de archivo no permitida: ${ruta}`);
    return absoluta;
  }
}

export const almacenamiento: Almacenamiento = new AlmacenamientoLocal(configuracion.RUTA_ALMACENAMIENTO);
