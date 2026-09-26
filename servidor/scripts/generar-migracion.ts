/**
 * Genera la migración de un módulo a partir de sus esquemas.
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
if (!existsSync(`src/modulos/${modulo}/esquemas`)) {
  console.error(`El módulo "${modulo}" no tiene carpeta esquemas/.`);
  process.exit(1);
}

const resultado = spawnSync('npx', ['drizzle-kit', 'generate', '--name', nombre, ...opciones], {
  stdio: 'inherit',
  env: { ...process.env, MODULO: modulo },
});
process.exit(resultado.status ?? 1);
