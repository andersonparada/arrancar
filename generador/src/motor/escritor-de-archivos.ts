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

/** Sin espacios ni comas finales: así se reconoce el código aunque Prettier lo haya reacomodado. */
const sinFormato = (codigo: string) => codigo.replace(/\s+/g, '').replace(/,(?=[}\])])/g, '');

/**
 * Escribe el código generado sin pisar nada: un archivo que ya existe se deja
 * como está, y lo que se agrega a un archivo existente va justo antes de su
 * marca `// generador: <marca>`, con la misma sangría. Anota cada cambio.
 *
 * Es todo o nada: los cambios se guardan en memoria y solo llegan al disco con
 * `confirmar()`. Si algo falla antes, no queda ningún archivo a medias.
 */
export class EscritorDeArchivos {
  private readonly cambios: Cambio[] = [];
  private readonly pendientes = new Map<string, string>();

  constructor(
    private readonly archivos: SistemaDeArchivos,
    private readonly raiz: string,
  ) {}

  crear(ruta: string, contenido: string): void {
    if (this.existe(ruta)) return this.anotar(ruta, 'omitido');
    this.pendientes.set(join(this.raiz, ruta), contenido);
    this.anotar(ruta, 'creado');
  }

  /** Si esas líneas ya están en el archivo, no las repite: se puede volver a generar. */
  insertarEnMarca(ruta: string, marca: string, lineas: string[]): void {
    const contenido = this.leer(ruta);
    const encontrada = lineaDeMarca(marca).exec(contenido);
    if (!encontrada) throw new MarcaNoEncontrada(ruta, marca);
    if (sinFormato(contenido).includes(sinFormato(lineas.join('\n')))) return this.anotar(ruta, 'ya-estaba');
    const sangria = encontrada[1] ?? '';
    const nuevas = lineas.map((linea) => `${sangria}${linea}\n`).join('');
    const antes = contenido.slice(0, encontrada.index);
    this.pendientes.set(join(this.raiz, ruta), antes + nuevas + contenido.slice(encontrada.index));
    this.anotar(ruta, 'insertado');
  }

  /** Cuenta lo que está por escribirse, como si ya estuviera en el disco. */
  existe(ruta: string): boolean {
    const completa = join(this.raiz, ruta);
    return this.pendientes.has(completa) || this.archivos.existe(completa);
  }

  leer(ruta: string): string {
    const completa = join(this.raiz, ruta);
    return this.pendientes.get(completa) ?? this.archivos.leer(completa);
  }

  /** Lleva al disco todo lo pendiente. */
  confirmar(): void {
    for (const [ruta, contenido] of this.pendientes) this.archivos.escribir(ruta, contenido);
    this.pendientes.clear();
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
