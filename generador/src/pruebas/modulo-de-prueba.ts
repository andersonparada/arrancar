import { GenerarRecurso } from '../comandos/generar-recurso.js';
import { definirRecurso, type EntradaDeRecurso } from '../definicion/definir-recurso.js';
import { EscritorDeArchivos } from '../motor/escritor-de-archivos.js';
import { SistemaDeArchivosEnMemoria } from '../motor/sistema-de-archivos.js';

export const SERVIDOR = '/p/servidor/src/modulos/ganado';
export const CLIENTE = '/p/cliente/src/modulos/ganado';

/** Un módulo `ganado` recién generado: solo sus marcas, en el servidor y en el cliente. */
export const MODULO_GENERADO: Record<string, string> = {
  [`${SERVIDOR}/modulo.ts`]: `import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
// generador: importaciones
export const moduloGanado = {
  nombre: 'Ganado bovino',
  permisos: [
    // generador: permisos
  ],
  rutas: rutasDelModulo([
    // generador: rutas
  ]),
};
`,
  [`${CLIENTE}/modulo.ts`]: `import { Beef } from 'lucide-vue-next';
// generador: importaciones
export const moduloGanado = {
  rutas: [
    // generador: rutas
  ],
  menu: [{ entradas: [
    // generador: menu
  ] }],
};
`,
  [`${CLIENTE}/textos.ts`]: `export const VENTANAS_GANADO = {
  // generador: ventanas
} as const;
`,
};

/** Genera el recurso en memoria y confirma; devuelve el disco para revisarlo. */
export async function generarEnMemoria(entrada: EntradaDeRecurso, ruta = 'ganado/animal') {
  const disco = new SistemaDeArchivosEnMemoria(MODULO_GENERADO);
  const escritor = new EscritorDeArchivos(disco, '/p');
  await new GenerarRecurso(escritor, async () => definirRecurso(entrada)).ejecutar(ruta);
  escritor.confirmar();
  return disco;
}
