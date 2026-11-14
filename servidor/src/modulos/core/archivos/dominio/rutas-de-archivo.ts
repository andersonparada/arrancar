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

  /**
   * ¿La ruta tiene la forma que generan `deImagen` y `deDocumento` (`<empresa>/<aaaa>/<mm>/<uuid>[_min].<ext>`)?
   * Todo lo demás (por ejemplo `instalacion/logo.png`) no es de las empresas y nadie debe borrarlo por huérfano.
   */
  static esGenerada(ruta: string): boolean {
    return PATRON_DE_RUTA_GENERADA.test(ruta);
  }

  private static base(empresaId: string, fecha: Date, nombreUnico: string): string {
    const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    return `${empresaId}/${fecha.getUTCFullYear()}/${mes}/${nombreUnico}`;
  }
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
/** Las extensiones que se guardan hoy: `.webp` (fotos y miniaturas) y `.pdf` (documentos). */
const PATRON_DE_RUTA_GENERADA = new RegExp(`^${UUID}/\\d{4}/\\d{2}/${UUID}(_min)?\\.(webp|pdf)$`);
