import { readFileSync } from 'node:fs';
import type { RegistroModulos } from '../../modulos-sistema/registro-modulos.js';
import type { ValoresDeInstalacion } from '../aplicacion/puertos/catalogo-de-variables.js';

/**
 * El archivo JSON de configuración de este servidor (`{ "clave": valor }`). Se
 * carga una vez al arrancar; sin archivo, el nivel de instalación queda vacío.
 */
export class ArchivoDeInstalacion implements ValoresDeInstalacion {
  private valores: Readonly<Record<string, unknown>> = {};

  /**
   * @throws Error si el archivo no es un objeto JSON, si una clave no existe, si
   *   la variable no admite el nivel de instalación o si un valor no cumple su esquema.
   */
  cargar(ruta: string | undefined, registro: RegistroModulos): void {
    if (!ruta) {
      this.valores = {};
      return;
    }
    const contenido = JSON.parse(readFileSync(ruta, 'utf8')) as unknown;
    if (typeof contenido !== 'object' || contenido === null || Array.isArray(contenido)) {
      throw new Error(`${ruta} debe contener un objeto JSON { "clave": valor }.`);
    }
    for (const entrada of Object.entries(contenido)) validarEntrada(ruta, registro, entrada);
    this.valores = Object.freeze({ ...(contenido as Record<string, unknown>) });
  }

  valor(clave: string): unknown {
    return this.valores[clave];
  }
}

function validarEntrada(ruta: string, registro: RegistroModulos, [clave, valor]: [string, unknown]): void {
  const definicion = registro.definicionConfiguracion(clave);
  if (!definicion) throw new Error(`${ruta}: la configuración "${clave}" no existe.`);
  if (!definicion.niveles.includes('instalacion')) {
    throw new Error(`${ruta}: "${clave}" no se puede fijar a nivel de instalación.`);
  }
  if (!definicion.esquema.safeParse(valor).success) {
    throw new Error(`${ruta}: el valor de "${clave}" no es válido.`);
  }
}

export const archivoDeInstalacion = new ArchivoDeInstalacion();
