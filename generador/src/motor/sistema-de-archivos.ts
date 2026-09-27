import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Dónde lee y escribe el generador. Las pruebas usan uno en memoria. */
export interface SistemaDeArchivos {
  existe(ruta: string): boolean;
  leer(ruta: string): string;
  /** Crea las carpetas que falten. */
  escribir(ruta: string, contenido: string): void;
}

export class SistemaDeArchivosDeDisco implements SistemaDeArchivos {
  existe(ruta: string): boolean {
    return existsSync(ruta);
  }

  leer(ruta: string): string {
    return readFileSync(ruta, 'utf8');
  }

  escribir(ruta: string, contenido: string): void {
    mkdirSync(dirname(ruta), { recursive: true });
    writeFileSync(ruta, contenido, 'utf8');
  }
}

export class SistemaDeArchivosEnMemoria implements SistemaDeArchivos {
  readonly archivos = new Map<string, string>();

  constructor(iniciales: Record<string, string> = {}) {
    Object.entries(iniciales).forEach(([ruta, contenido]) => this.archivos.set(ruta, contenido));
  }

  existe(ruta: string): boolean {
    return this.archivos.has(ruta);
  }

  leer(ruta: string): string {
    const contenido = this.archivos.get(ruta);
    if (contenido === undefined) throw new Error(`No existe ${ruta}.`);
    return contenido;
  }

  escribir(ruta: string, contenido: string): void {
    this.archivos.set(ruta, contenido);
  }
}
