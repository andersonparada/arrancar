import { availableParallelism } from 'node:os';

/** Prefijo de las bases de pruebas; cada agente usa el suyo con `BD_PRUEBAS`. */
export const PREFIJO_BD_PRUEBAS = process.env.BD_PRUEBAS ?? 'arrancar_pruebas';

const SERVIDOR = 'localhost:5433';

/** Base migrada una vez por corrida, de la que se clonan las de los workers. */
export const BD_PLANTILLA = `${PREFIJO_BD_PRUEBAS}_plantilla`;

/** Base propia de un worker de Vitest (`VITEST_POOL_ID` va de 1 al máximo de workers). */
export const bdDelWorker = (idDelWorker: number | string): string => `${PREFIJO_BD_PRUEBAS}_${idDelWorker}`;

export const urlDeLaAplicacion = (base: string): string => `postgres://arrancar_app:arrancar_app@${SERVIDOR}/${base}`;

export const urlDelPropietario = (base: string): string => `postgres://arrancar:arrancar@${SERVIDOR}/${base}`;

/**
 * Workers de Vitest: `VITEST_MAX_WORKERS` si está definido; si no, la mitad de los
 * núcleos con tope de 8 (las pruebas usan PostgreSQL real y la máquina se comparte).
 */
export function trabajadoresDePruebas(): number {
  const pedido = Number(process.env.VITEST_MAX_WORKERS);
  if (Number.isInteger(pedido) && pedido > 0) return pedido;
  return Math.max(1, Math.min(8, Math.floor(availableParallelism() / 2)));
}
