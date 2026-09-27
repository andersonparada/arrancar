import { spawnSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GenerarModulo } from './comandos/generar-modulo.js';
import { ErrorDelGenerador } from './definicion/errores.js';
import { AYUDA, leerOrden, type Orden } from './linea-de-comandos.js';
import { EscritorDeArchivos, type Accion } from './motor/escritor-de-archivos.js';
import { SistemaDeArchivosDeDisco } from './motor/sistema-de-archivos.js';

/** La raíz del proyecto: el generador vive en `generador/src`. */
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const SIMBOLOS: Record<Accion, string> = { creado: '+', insertado: '~', omitido: '=', 'ya-estaba': '=' };

const hoy = () => new Date().toISOString().slice(0, 10);

function ejecutar({ comando, argumentos, opciones }: Orden, escritor: EscritorDeArchivos): boolean {
  if (comando === 'modulo') {
    const [clave = ''] = argumentos;
    new GenerarModulo(escritor).ejecutar({ clave, ...opciones, fecha: hoy() });
    return true;
  }
  if (comando === 'recurso') throw new ErrorDelGenerador('Generar recursos llega en el paso G2 del plan.');
  console.log(AYUDA);
  return false;
}

/** Lo generado queda con el formato del proyecto, igual que si se hubiera escrito a mano. */
function darFormato(archivos: string[]): void {
  if (archivos.length === 0) return;
  spawnSync('npx', ['prettier', '--write', '--log-level', 'warn', ...archivos], { cwd: RAIZ, stdio: 'inherit' });
}

function informar(escritor: EscritorDeArchivos): void {
  for (const { ruta, accion } of escritor.resumen) console.log(`  ${SIMBOLOS[accion]} ${ruta} (${accion})`);
  console.log('\n+ creado · ~ agregado en su marca · = ya existía, no se tocó');
}

try {
  const escritor = new EscritorDeArchivos(new SistemaDeArchivosDeDisco(), RAIZ);
  if (ejecutar(leerOrden(process.argv.slice(2)), escritor)) {
    darFormato(escritor.tocados.map((ruta) => relative(RAIZ, ruta)));
    informar(escritor);
  }
} catch (error) {
  if (!(error instanceof ErrorDelGenerador)) throw error;
  console.error(error.message);
  process.exitCode = 1;
}
