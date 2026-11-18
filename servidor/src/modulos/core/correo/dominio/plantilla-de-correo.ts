import { MarcadorDesconocido } from './errores-de-correo.js';
import { sanearParaCuerpo } from './saneado.js';

const MARCADOR = /\{([^{}\s]*)\}/g;

/**
 * Texto con marcadores `{nombre}` que se reemplazan por valores. Cada tipo de correo declara la lista
 * cerrada de marcadores: uno desconocido es un error al crear la plantilla (al guardar la configuración),
 * nunca se deja literal en el correo. Los valores se reemplazan en una sola pasada: un valor que parezca
 * marcador no se vuelve a expandir.
 */
export class PlantillaDeCorreo {
  private constructor(
    readonly texto: string,
    readonly marcadores: readonly string[],
  ) {}

  /** Crea la plantilla o lanza `MarcadorDesconocido` si usa uno que no está en `permitidos`. */
  static crear(texto: string, permitidos: readonly string[]): PlantillaDeCorreo {
    const usados = [...texto.matchAll(MARCADOR)].map((coincidencia) => coincidencia[1] as string);
    const desconocido = usados.find((marcador) => !permitidos.includes(marcador));
    if (desconocido !== undefined) throw new MarcadorDesconocido(desconocido, permitidos);
    return new PlantillaDeCorreo(texto, [...new Set(usados)]);
  }

  /** Reemplaza los marcadores; un valor que falte queda vacío y los controles del valor se quitan. */
  aplicar(valores: Readonly<Record<string, string>>): string {
    return this.texto.replace(MARCADOR, (_, marcador: string) => sanearParaCuerpo(valores[marcador] ?? ''));
  }
}
