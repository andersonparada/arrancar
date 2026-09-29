/**
 * Dónde se guardan los archivos: agrupados por empresa y mes de subida, para que las
 * carpetas no crezcan sin límite. Una imagen tiene dos variantes; un documento, una sola.
 */
export class RutasDeArchivo {
  private constructor(
    readonly original: string,
    readonly miniatura: string | null,
  ) {}

  /** Foto en WebP: la normal y la miniatura. */
  static deImagen(empresaId: string, fecha: Date, nombreUnico: string): RutasDeArchivo {
    const base = RutasDeArchivo.base(empresaId, fecha, nombreUnico);
    return new RutasDeArchivo(`${base}.webp`, `${base}_min.webp`);
  }

  /** Documento (PDF o foto de un documento) sin miniatura; `nombreConExtension` lleva la del formato guardado. */
  static deDocumento(empresaId: string, fecha: Date, nombreConExtension: string): RutasDeArchivo {
    return new RutasDeArchivo(RutasDeArchivo.base(empresaId, fecha, nombreConExtension), null);
  }

  private static base(empresaId: string, fecha: Date, nombreUnico: string): string {
    const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    return `${empresaId}/${fecha.getUTCFullYear()}/${mes}/${nombreUnico}`;
  }
}
