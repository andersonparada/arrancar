import type { EstadoDeCuentaAdjuntado } from '../../servicios/conciliaciones.api';

/** Tipos que acepta el servidor para el estado de cuenta (sin HEIC: el celular debe guardarlo como JPEG). */
export const TIPOS_DE_ESTADO_DE_CUENTA = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const ACEPTAR_ESTADO_DE_CUENTA = TIPOS_DE_ESTADO_DE_CUENTA.join(',');

const MB = 1024 * 1024;
const TOPE_DE_PDF = 10 * MB;
const TOPE_DE_FOTO = 15 * MB;

/** El tamaño en la unidad que se entiende a simple vista: `850 KB`, `2.4 MB`. */
export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

/** Revisa el archivo elegido antes de subirlo; devuelve cómo corregirlo, o `null` si está bien. */
export function problemaDelArchivo(archivo: Pick<File, 'type' | 'size' | 'name'>): string | null {
  if (/\.hei[cf]$/i.test(archivo.name) || /hei[cf]/i.test(archivo.type)) {
    return 'Las fotos HEIC no se aceptan: tome la foto en formato JPEG o compártala como JPEG.';
  }
  if (!TIPOS_DE_ESTADO_DE_CUENTA.includes(archivo.type)) {
    return 'Solo se aceptan PDF o fotos JPEG, PNG o WebP.';
  }
  if (archivo.size === 0) return 'El archivo está vacío: elija otro.';
  const tope = archivo.type === 'application/pdf' ? TOPE_DE_PDF : TOPE_DE_FOTO;
  if (archivo.size > tope) {
    return `El archivo pesa ${formatearTamano(archivo.size)} y el máximo es ${formatearTamano(tope)}: reduzca su tamaño.`;
  }
  return null;
}

export const esPdf = (estadoDeCuenta: Pick<EstadoDeCuentaAdjuntado, 'tipoMime'>): boolean =>
  estadoDeCuenta.tipoMime === 'application/pdf';

/** Los primeros 12 caracteres de la huella, para reconocer el archivo sin llenar la pantalla. */
export const huellaCorta = (sha256: string): string => sha256.slice(0, 12);

/** Los datos del archivo para mostrar bajo su nombre: tipo, páginas y tamaño. */
export function descripcionDelArchivo(estadoDeCuenta: EstadoDeCuentaAdjuntado): string {
  const tipo = esPdf(estadoDeCuenta) ? 'PDF' : 'Foto';
  const paginas = estadoDeCuenta.paginas === null ? [] : [`${estadoDeCuenta.paginas} pág.`];
  return [tipo, ...paginas, formatearTamano(estadoDeCuenta.tamanoBytes)].join(' · ');
}

/** Si el servidor dice que la conciliación ya no está en proceso, lo que se ve en pantalla está desactualizado. */
export const estaDesactualizada = (codigoDeError: string): boolean =>
  codigoDeError === 'conciliacion_no_esta_en_proceso';
