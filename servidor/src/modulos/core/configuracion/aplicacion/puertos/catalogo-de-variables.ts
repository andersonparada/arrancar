import type { DefinicionConfiguracion } from '../../../modulos-sistema/definicion-modulo.js';

/** Las variables que declaran los módulos instalados. */
export interface CatalogoDeVariables {
  /** De los módulos indicados, o de todos los instalados si se omiten. */
  definiciones(modulosActivos?: ReadonlySet<string>): DefinicionConfiguracion[];
}

/** Valores fijados en el archivo de configuración del servidor. */
export interface ValoresDeInstalacion {
  valor(clave: string): unknown;
}
