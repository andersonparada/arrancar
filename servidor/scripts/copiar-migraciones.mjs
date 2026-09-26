// Copia las migraciones SQL de cada módulo a dist/, porque tsc solo compila .ts.
import { cpSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const origen = 'src/modulos';
for (const modulo of readdirSync(origen, { withFileTypes: true })) {
  const carpeta = join(origen, modulo.name, 'migraciones');
  if (modulo.isDirectory() && existsSync(carpeta)) {
    cpSync(carpeta, join('dist/modulos', modulo.name, 'migraciones'), { recursive: true });
  }
}
