import { availableParallelism } from 'node:os';

const SERVIDOR = 'localhost:5433';
const FORMA_DEL_PREFIJO = /^[a-z][a-z0-9_]{0,40}$/;

/**
 * Comprueba el prefijo de las bases de pruebas y lo devuelve. Solo acepta minúsculas, dígitos y guion bajo
 * (hasta 41 caracteres, empezando con letra) y nunca `arrancar`, que es la base de desarrollo.
 * @throws Error si el prefijo está vacío o no cumple.
 */
export function validarPrefijoDeBases(prefijo: string): string {
  if (!FORMA_DEL_PREFIJO.test(prefijo) || prefijo === 'arrancar') {
    throw new Error(
      `BD_PRUEBAS "${prefijo}" no es válido: use solo minúsculas, dígitos y "_" (1 a 41 caracteres, empezando con letra) y distinto de "arrancar".`,
    );
  }
  return prefijo;
}

/**
 * Indica si `nombre` es la plantilla (`<prefijo>_plantilla`) o la base de un worker (`<prefijo>_<dígitos>`).
 * Compara en JavaScript, nunca con expresiones regulares armadas con el prefijo.
 */
export function esBaseDePruebasDelPrefijo(nombre: string, prefijo: string): boolean {
  if (nombre === `${prefijo}_plantilla`) return true;
  if (!nombre.startsWith(`${prefijo}_`)) return false;
  return /^[0-9]+$/.test(nombre.slice(prefijo.length + 1));
}

/** Prefijo de las bases de pruebas; cada agente usa el suyo con `BD_PRUEBAS`. */
export const PREFIJO_BD_PRUEBAS = validarPrefijoDeBases(process.env.BD_PRUEBAS ?? 'arrancar_pruebas');

/** Base migrada una vez por corrida, de la que se clonan las de los workers. */
export const BD_PLANTILLA = `${PREFIJO_BD_PRUEBAS}_plantilla`;

/** Base propia de un worker de Vitest (`VITEST_POOL_ID` va de 1 al máximo de workers). */
export const bdDelWorker = (idDelWorker: number | string): string => `${PREFIJO_BD_PRUEBAS}_${idDelWorker}`;

/** URL de una base con el rol de la aplicación (`arrancar_app`, sin privilegios). */
export const urlDeLaAplicacion = (base: string): string => `postgres://arrancar_app:arrancar_app@${SERVIDOR}/${base}`;

/** URL de una base con el rol propietario (`arrancar`), el que migra y crea bases. */
export const urlDelPropietario = (base: string): string => `postgres://arrancar:arrancar@${SERVIDOR}/${base}`;

/**
 * Workers por omisión: la mitad de los núcleos con tope de 8 (las pruebas usan PostgreSQL real y la
 * máquina se comparte). Con `--maxWorkers` o `VITEST_MAX_WORKERS`, `globalSetup` usa el valor que Vitest resolvió.
 */
export function trabajadoresPorOmision(): number {
  return Math.max(1, Math.min(8, Math.floor(availableParallelism() / 2)));
}
