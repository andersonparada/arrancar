import type { DefinicionDeRecurso } from './definicion/definir-recurso.js';
import type { EscritorDeArchivos } from './motor/escritor-de-archivos.js';
import { fragmentosDeVariante, leerPlantilla, rellenar } from './motor/plantillas.js';
import { valoresDelRecurso } from './valores-del-recurso.js';

/** Una plantilla de la carpeta del lado y dónde queda, con huecos en la ruta. */
export type Archivo = [plantilla: string, destino: string];

/**
 * Cómo se genera un recurso en un lado (servidor o cliente), con el patrón
 * Template Method: los pasos son siempre los mismos y cada lado dice qué
 * archivos escribe, qué huecos aporta y cómo se registra en su módulo.
 */
export abstract class GeneracionDeRecurso {
  /** Carpeta de sus plantillas: `recurso/servidor`. */
  protected abstract readonly carpeta: string;

  constructor(
    protected readonly escritor: EscritorDeArchivos,
    private readonly plantilla: (ruta: string) => string = leerPlantilla,
  ) {}

  /** Rellena todo antes de escribir: si una plantilla falla, no queda nada a medias. */
  ejecutar(definicion: DefinicionDeRecurso, nombreModulo: string): void {
    const valores = this.valores(definicion, nombreModulo);
    const archivos = this.archivos(definicion).map(([plantilla, destino]) => [
      rellenar(destino, valores),
      rellenar(this.plantilla(`${this.carpeta}/${plantilla}`), valores),
    ]);
    for (const [destino, contenido] of archivos) this.escritor.crear(destino!, contenido!);
    this.registrar(definicion, valores);
  }

  protected abstract archivos(definicion: DefinicionDeRecurso): Archivo[];

  /** Los huecos que dependen de los campos. */
  protected abstract fragmentos(definicion: DefinicionDeRecurso): Record<string, string>;

  protected abstract registrar(definicion: DefinicionDeRecurso, valores: Record<string, string>): void;

  /** Lo que cambia según la baja sale de `baja-<eliminar|inactivar>.fragmentos`. */
  private valores(definicion: DefinicionDeRecurso, nombreModulo: string): Record<string, string> {
    const valores = { ...valoresDelRecurso(definicion, nombreModulo), ...this.fragmentos(definicion) };
    const completa = this.plantilla(`${this.carpeta}/baja-eliminar.fragmentos`);
    const variante = this.plantilla(`${this.carpeta}/baja-${definicion.baja}.fragmentos`);
    return { ...valores, ...fragmentosDeVariante(completa, variante, valores) };
  }
}
