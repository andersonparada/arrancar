import { join } from 'node:path';
import { ErrorDelGenerador } from '../definicion/errores.js';
import type { SistemaDeArchivos } from './sistema-de-archivos.js';

export type Accion = 'creado' | 'omitido' | 'insertado' | 'ya-estaba';

export interface Cambio {
  /** Relativa a la raíz del proyecto. */
  ruta: string;
  accion: Accion;
}

export class MarcaNoEncontrada extends ErrorDelGenerador {
  override readonly name = 'MarcaNoEncontrada';

  constructor(ruta: string, marca: string) {
    super(`${ruta} no tiene la marca "// generador: ${marca}". Agréguela donde deba ir el código generado.`);
  }
}

const lineaDeMarca = (marca: string) => new RegExp(`^([ \\t]*)// generador: ${marca}[ \\t]*$`, 'm');

/**
 * Escribe el código generado sin pisar nada: un archivo que ya existe se deja
 * como está, y lo que se agrega a un archivo existente va justo antes de su
 * marca `// generador: <marca>`, con la misma sangría. Anota cada cambio.
 */
export class EscritorDeArchivos {
  private readonly cambios: Cambio[] = [];

  constructor(
    private readonly archivos: SistemaDeArchivos,
    private readonly raiz: string,
  ) {}

  crear(ruta: string, contenido: string): void {
    const completa = join(this.raiz, ruta);
    if (this.archivos.existe(completa)) return this.anotar(ruta, 'omitido');
    this.archivos.escribir(completa, contenido);
    this.anotar(ruta, 'creado');
  }

  /** Si esas líneas ya están en el archivo, no las repite: se puede volver a generar. */
  insertarEnMarca(ruta: string, marca: string, lineas: string[]): void {
    const completa = join(this.raiz, ruta);
    const contenido = this.archivos.leer(completa);
    const encontrada = lineaDeMarca(marca).exec(contenido);
    if (!encontrada) throw new MarcaNoEncontrada(ruta, marca);
    if (lineas.every((linea) => contenido.includes(linea.trim()))) return this.anotar(ruta, 'ya-estaba');
    const sangria = encontrada[1] ?? '';
    const nuevas = lineas.map((linea) => `${sangria}${linea}\n`).join('');
    this.archivos.escribir(completa, contenido.slice(0, encontrada.index) + nuevas + contenido.slice(encontrada.index));
    this.anotar(ruta, 'insertado');
  }

  existe(ruta: string): boolean {
    return this.archivos.existe(join(this.raiz, ruta));
  }

  leer(ruta: string): string {
    return this.archivos.leer(join(this.raiz, ruta));
  }

  get resumen(): readonly Cambio[] {
    return this.cambios;
  }

  /** Los archivos que cambiaron, para darles formato. */
  get tocados(): string[] {
    return this.cambios
      .filter(({ accion }) => accion === 'creado' || accion === 'insertado')
      .map(({ ruta }) => join(this.raiz, ruta));
  }

  private anotar(ruta: string, accion: Accion): void {
    this.cambios.push({ ruta, accion });
  }
}
