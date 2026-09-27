import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CrearDefinicion } from './comandos/crear-definicion.js';
import { GenerarModulo } from './comandos/generar-modulo.js';
import { GenerarRecurso, type CargadorDeDefiniciones } from './comandos/generar-recurso.js';
import type { DefinicionDeRecurso } from './definicion/definir-recurso.js';
import { ErrorDelGenerador } from './definicion/errores.js';
import { AYUDA, leerOrden, type Orden } from './linea-de-comandos.js';
import { EscritorDeArchivos, type Accion } from './motor/escritor-de-archivos.js';
import { SistemaDeArchivosDeDisco } from './motor/sistema-de-archivos.js';

/** La raíz del proyecto: el generador vive en `generador/src`. */
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const SIMBOLOS: Record<Accion, string> = { creado: '+', insertado: '~', omitido: '=', 'ya-estaba': '=' };

const hoy = () => new Date().toISOString().slice(0, 10);

const cargarDefinicion: CargadorDeDefiniciones = async (ruta) => {
  const archivo = join(RAIZ, 'generador', 'definiciones', `${ruta}.ts`);
  if (!existsSync(archivo)) {
    throw new ErrorDelGenerador(
      `No existe ${relative(RAIZ, archivo)}. Créela con: npm run generar -- definicion ${ruta}`,
    );
  }
  const { recurso } = (await import(pathToFileURL(archivo).href)) as { recurso?: DefinicionDeRecurso };
  if (!recurso)
    throw new ErrorDelGenerador(
      `${relative(RAIZ, archivo)} debe exportar: export const recurso = definirRecurso({...})`,
    );
  return recurso;
};

/** Pasos que corren después de escribir: la migración de las tablas nuevas. */
type Despues = () => void;

async function ejecutar(
  { comando, argumentos, opciones }: Orden,
  escritor: EscritorDeArchivos,
): Promise<Despues | null> {
  const [primero = ''] = argumentos;
  if (comando === 'modulo') {
    new GenerarModulo(escritor).ejecutar({ clave: primero, ...opciones, fecha: hoy() });
    return () => {};
  }
  if (comando === 'definicion') {
    new CrearDefinicion(escritor).ejecutar(primero);
    return () => {};
  }
  if (comando === 'recurso') {
    const definicion = await new GenerarRecurso(escritor, cargarDefinicion).ejecutar(primero);
    return () => generarMigracion(definicion);
  }
  console.log(AYUDA);
  return null;
}

function correr(comando: string, argumentos: string[]): void {
  spawnSync(comando, argumentos, { cwd: RAIZ, stdio: 'inherit' });
}

/** Lo generado queda con el formato del proyecto, igual que si se hubiera escrito a mano. */
function darFormato(archivos: string[]): void {
  if (archivos.length > 0) correr('npx', ['prettier', '--write', '--log-level', 'warn', ...archivos]);
}

/** drizzle-kit compara las tablas con la última migración del módulo; si no cambió nada, no crea otra. */
function generarMigracion({ modulo, plural }: DefinicionDeRecurso): void {
  console.log(`\nMigración de ${modulo.clave}:`);
  correr('npm', ['run', 'bd:generar', '--silent', '-w', 'servidor', '--', modulo.clave, plural.serpiente]);
}

function informar(escritor: EscritorDeArchivos): void {
  for (const { ruta, accion } of escritor.resumen) console.log(`  ${SIMBOLOS[accion]} ${ruta} (${accion})`);
  console.log('\n+ creado · ~ agregado en su marca · = ya existía, no se tocó');
}

try {
  const escritor = new EscritorDeArchivos(new SistemaDeArchivosDeDisco(), RAIZ);
  const despues = await ejecutar(leerOrden(process.argv.slice(2)), escritor);
  if (despues) {
    escritor.confirmar();
    darFormato(escritor.tocados.map((ruta) => relative(RAIZ, ruta)));
    informar(escritor);
    despues();
  }
} catch (error) {
  if (!(error instanceof ErrorDelGenerador)) throw error;
  console.error(error.message);
  process.exitCode = 1;
}
