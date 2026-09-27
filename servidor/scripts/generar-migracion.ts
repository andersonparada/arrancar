/**
 * Genera la migración de un módulo a partir de sus tablas.
 * Uso: npm run bd:generar -- <modulo> <nombre-descriptivo> [--custom]
 * Con --custom crea un archivo SQL vacío para migraciones de datos.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const [modulo, nombre, ...opciones] = process.argv.slice(2);

if (!modulo || !nombre) {
  console.error('Uso: npm run bd:generar -- <modulo> <nombre-descriptivo> [--custom]');
  process.exit(1);
}
const carpetasDeTablas = [`src/modulos/${modulo}/infraestructura/persistencia`, `src/modulos/${modulo}/esquemas`];
if (!carpetasDeTablas.some((carpeta) => existsSync(carpeta))) {
  console.error(`El módulo "${modulo}" no tiene tablas (${carpetasDeTablas.join(' ni ')}).`);
  process.exit(1);
}

const resultado = spawnSync('npx', ['drizzle-kit', 'generate', '--name', nombre, ...opciones], {
  stdio: 'inherit',
  env: { ...process.env, MODULO: modulo },
});
process.exit(resultado.status ?? 1);
