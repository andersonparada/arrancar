import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configuracion } from '../../../../configuracion.js';
import { versionDeQpdf } from '../infraestructura/qpdf/verificador-de-qpdf.js';

export const RUTA_QPDF_DE_PRUEBA = configuracion.RUTA_QPDF;

function qpdfDisponible(): boolean {
  try {
    const salida = execFileSync(RUTA_QPDF_DE_PRUEBA, ['--version'], { encoding: 'utf8', env: {} });
    return Number.parseInt(versionDeQpdf(salida) ?? '0', 10) >= 11 && existsSync('/usr/bin/prlimit');
  } catch {
    return false;
  }
}

/** Las pruebas que necesitan qpdf (11+) real y `prlimit` se saltan si faltan, con este aviso. */
export const hayQpdf = qpdfDisponible();

if (!hayQpdf) {
  console.warn(
    `AVISO: no hay qpdf 11+ en RUTA_QPDF (${RUTA_QPDF_DE_PRUEBA}) o falta prlimit: ` +
      'se SALTAN las pruebas que necesitan qpdf real. Instálelo (ver CLAUDE.md) para correrlas.',
  );
}

/** Ordena a qpdf transformar un PDF de prueba (cifrarlo, generar object streams…) y devuelve el resultado. */
export function transformarConQpdf(pdf: Buffer, argumentos: string[]): Buffer {
  const carpeta = mkdtempSync(join(tmpdir(), 'prueba-qpdf-'));
  try {
    writeFileSync(join(carpeta, 'entrada.pdf'), pdf);
    const parametros = [...argumentos, join(carpeta, 'entrada.pdf'), join(carpeta, 'salida.pdf')];
    try {
      execFileSync(RUTA_QPDF_DE_PRUEBA, parametros, { stdio: 'ignore' });
    } catch (error) {
      // 3 significa «funcionó con avisos»: el PDF de prueba escrito a mano no trae tabla de referencias.
      if ((error as { status?: number }).status !== 3) throw error;
    }
    return readFileSync(join(carpeta, 'salida.pdf'));
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
}
