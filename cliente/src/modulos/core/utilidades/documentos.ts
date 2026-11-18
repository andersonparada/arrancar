/** Lo que se muestra de un documento adjunto (PDF o foto) guardado en el servidor. */
export interface DescripcionDeDocumento {
  nombreOriginal: string | null;
  tamanoBytes: number;
  paginas: number | null;
  sha256: string;
  subidoEn: string;
  subidoPorNombre: string | null;
  /** Sin él se asume PDF. */
  tipoMime?: string;
}

/** Qué se acepta de un archivo que se va a subir. */
export interface ReglasDeDocumento {
  tipos: string[];
  /** Tope en bytes por tipo; `porOmision` vale para los demás. */
  topes: Record<string, number>;
  porOmision: number;
  /** Lo que se le pide al usuario si el tipo no sirve, p. ej. «Adjunte el balance en PDF». */
  mensajeDeTipo: string;
}

const MB = 1024 * 1024;

/** Solo PDF hasta 10 MB: lo que acepta el servidor para los documentos de respaldo. */
export const SOLO_PDF: ReglasDeDocumento = {
  tipos: ['application/pdf'],
  topes: {},
  porOmision: 10 * MB,
  mensajeDeTipo: 'Adjunte el archivo en PDF; si lo tiene en papel, escanéelo como PDF.',
};

/** El tamaño en la unidad que se entiende a simple vista: `850 KB`, `2.4 MB`. */
export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

/** Revisa el archivo elegido antes de subirlo; devuelve cómo corregirlo, o `null` si está bien. */
export function problemaDelDocumento(
  archivo: Pick<File, 'type' | 'size' | 'name'>,
  reglas: ReglasDeDocumento,
): string | null {
  if (!reglas.tipos.includes(archivo.type)) return reglas.mensajeDeTipo;
  if (archivo.size === 0) return 'El archivo está vacío: elija otro.';
  const tope = reglas.topes[archivo.type] ?? reglas.porOmision;
  if (archivo.size > tope) {
    return `El archivo pesa ${formatearTamano(archivo.size)} y el máximo es ${formatearTamano(tope)}: reduzca su tamaño.`;
  }
  return null;
}

export const documentoEsPdf = (documento: DescripcionDeDocumento | { tipoMime?: string }): boolean =>
  (documento.tipoMime ?? 'application/pdf') === 'application/pdf';

/** Los primeros 12 caracteres de la huella, para reconocer el archivo sin llenar la pantalla. */
export const huellaCorta = (sha256: string): string => sha256.slice(0, 12);

/** Tipo, páginas y tamaño para mostrar bajo el nombre: `PDF · 3 pág. · 1.2 MB`. */
export function descripcionDelDocumento(documento: DescripcionDeDocumento): string {
  const tipo = documentoEsPdf(documento) ? 'PDF' : 'Foto';
  const paginas = documento.paginas === null ? [] : [`${documento.paginas} pág.`];
  return [tipo, ...paginas, formatearTamano(documento.tamanoBytes)].join(' · ');
}
