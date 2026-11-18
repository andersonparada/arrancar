import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { bdDelWorker, urlDeLaAplicacion, urlDelPropietario } from './nombres-de-bases.js';

/**
 * Se ejecuta antes de cada archivo de pruebas: apunta la aplicación a la base, la carpeta
 * de archivos y la carpeta temporal propias del worker, para que nada se comparta entre ellos.
 */
const idDelWorker = process.env.VITEST_POOL_ID ?? '1';
const base = bdDelWorker(idDelWorker);

process.env.DATABASE_URL = urlDeLaAplicacion(base);
process.env.DATABASE_URL_PROPIETARIO = urlDelPropietario(base);
// Las pruebas no necesitan esperar el flush a disco de cada commit (con la máquina cargada pesa mucho).
process.env.PGOPTIONS = '-c synchronous_commit=off';
process.env.RUTA_ALMACENAMIENTO = resolve(`./almacenamiento-pruebas/worker-${idDelWorker}`);

if (!process.env.TMPDIR?.includes('arrancar-pruebas-')) {
  const temporal = join(tmpdir(), `arrancar-pruebas-${base}`);
  mkdirSync(temporal, { recursive: true });
  process.env.TMPDIR = temporal;
}
