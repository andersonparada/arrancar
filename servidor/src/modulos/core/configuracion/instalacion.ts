import { readFileSync } from 'node:fs';
import type { RegistroModulos } from '../modulos-sistema/registro-modulos.js';

let valoresInstalacion: Readonly<Record<string, unknown>> = {};

/**
 * Lee el archivo JSON de configuración de este servidor (`{ "clave": valor }`) y
 * lo valida contra las variables declaradas por los módulos.
 * Sin archivo, el nivel de instalación queda vacío.
 * @throws Error si el archivo no es JSON, si una clave no existe, si la variable
 *   no admite el nivel de instalación o si un valor no cumple su esquema.
 */
export function cargarConfiguracionInstalacion(ruta: string | undefined, registro: RegistroModulos): void {
  if (!ruta) {
    valoresInstalacion = {};
    return;
  }
  const contenido = JSON.parse(readFileSync(ruta, 'utf8')) as unknown;
  if (typeof contenido !== 'object' || contenido === null || Array.isArray(contenido)) {
    throw new Error(`${ruta} debe contener un objeto JSON { "clave": valor }.`);
  }

  for (const [clave, valor] of Object.entries(contenido)) {
    const definicion = registro.definicionConfiguracion(clave);
    if (!definicion) throw new Error(`${ruta}: la configuración "${clave}" no existe.`);
    if (!definicion.niveles.includes('instalacion')) {
      throw new Error(`${ruta}: "${clave}" no se puede fijar a nivel de instalación.`);
    }
    if (!definicion.esquema.safeParse(valor).success) {
      throw new Error(`${ruta}: el valor de "${clave}" no es válido.`);
    }
  }
  valoresInstalacion = Object.freeze({ ...(contenido as Record<string, unknown>) });
}

export function obtenerValorInstalacion(clave: string): unknown {
  return valoresInstalacion[clave];
}
