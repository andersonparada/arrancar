import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);

/** Desde qpdf 11.0.0 existe el JSON versión 2 que usa el inspector. */
const VERSION_MINIMA = 11;

/** Lee la versión de qpdf de su salida: «qpdf version 11.3.0». */
export function versionDeQpdf(salida: string): string | null {
  return /qpdf version (\d+\.\d+\.\d+)/.exec(salida)?.[1] ?? null;
}

/**
 * Comprueba que qpdf esté instalado y sea de la versión 11 o posterior.
 * @returns La versión encontrada.
 * @throws Error con el motivo y cómo arreglarlo (variable `RUTA_QPDF`) si falta o es antigua.
 */
export async function verificarQpdf(rutaQpdf: string): Promise<string> {
  let salida: string;
  try {
    salida = (await ejecutar(rutaQpdf, ['--version'], { env: {}, timeout: 5000 })).stdout;
  } catch {
    throw new Error(`No se encontró qpdf en "${rutaQpdf}". Instálelo (versión 11 o posterior) o indique RUTA_QPDF.`);
  }
  const version = versionDeQpdf(salida);
  if (!version || Number.parseInt(version, 10) < VERSION_MINIMA) {
    throw new Error(`Se necesita qpdf ${VERSION_MINIMA} o posterior y "${rutaQpdf}" es ${version ?? 'desconocido'}.`);
  }
  return version;
}
