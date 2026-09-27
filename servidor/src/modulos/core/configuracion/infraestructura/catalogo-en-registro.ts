import type { DefinicionConfiguracion } from '../../modulos-sistema/definicion-modulo.js';
import { obtenerRegistroModulos } from '../../modulos-sistema/registro-global.js';
import type { CatalogoDeVariables } from '../aplicacion/puertos/catalogo-de-variables.js';

/** Lee el registro al consultar: los módulos se registran después de armar las rutas. */
export class CatalogoEnRegistro implements CatalogoDeVariables {
  definiciones(modulosActivos?: ReadonlySet<string>): DefinicionConfiguracion[] {
    return obtenerRegistroModulos().configuracionesDe(modulosActivos);
  }
}
