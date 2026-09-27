/**
 * Dónde se guardan las dos variantes de una imagen: agrupadas por empresa y mes
 * de subida, para que las carpetas no crezcan sin límite.
 */
export class RutasDeImagen {
  private constructor(
    readonly original: string,
    readonly miniatura: string,
  ) {}

  static nuevas(empresaId: string, fecha: Date, nombreUnico: string): RutasDeImagen {
    const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const base = `${empresaId}/${fecha.getUTCFullYear()}/${mes}/${nombreUnico}`;
    return new RutasDeImagen(`${base}.webp`, `${base}_min.webp`);
  }
}
