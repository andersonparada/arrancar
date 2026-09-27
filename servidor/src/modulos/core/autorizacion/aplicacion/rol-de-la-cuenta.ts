import { RecursoNoEncontrado } from '../../compartido/aplicacion/errores.js';
import type { Operador } from '../../compartido/aplicacion/operador.js';
import { Identificador } from '../../compartido/dominio/identificador.js';
import type { Rol } from '../dominio/rol.js';
import type { RepositorioRoles } from './puertos/repositorio-roles.js';

/** @throws RecursoNoEncontrado si el rol no existe o es de otra cuenta. */
export async function rolDeLaCuenta(repositorio: RepositorioRoles, rolId: string, operador: Operador): Promise<Rol> {
  const rol = await repositorio.buscarEnCuenta(Identificador.desde(rolId), Identificador.desde(operador.cuentaId));
  if (!rol) throw new RecursoNoEncontrado('El rol');
  return rol;
}
