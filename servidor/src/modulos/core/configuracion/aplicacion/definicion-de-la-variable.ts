import { RecursoNoEncontrado } from '../../compartido/aplicacion/errores.js';
import type { DefinicionConfiguracion } from '../../modulos-sistema/definicion-modulo.js';
import type { CatalogoDeVariables } from './puertos/catalogo-de-variables.js';

/**
 * La variable, si existe entre las de los módulos activos.
 * @throws RecursoNoEncontrado si no existe o su módulo no está activo.
 */
export function definicionDeLaVariable(
  catalogo: CatalogoDeVariables,
  clave: string,
  modulosActivos?: ReadonlySet<string>,
): DefinicionConfiguracion {
  const definicion = catalogo.definiciones(modulosActivos).find((d) => d.clave === clave);
  if (!definicion) throw new RecursoNoEncontrado('La configuración');
  return definicion;
}
