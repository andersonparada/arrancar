import { RecursoNoEncontrado } from '../../compartido/aplicacion/errores.js';
import { Identificador } from '../../compartido/dominio/identificador.js';
import type { Cuenta } from '../dominio/cuenta.js';
import type { RepositorioCuentas } from './puertos/repositorio-cuentas.js';

/** @throws RecursoNoEncontrado si no existe. */
export async function cuentaExistente(repositorio: RepositorioCuentas, cuentaId: string): Promise<Cuenta> {
  const cuenta = await repositorio.buscar(Identificador.desde(cuentaId));
  if (!cuenta) throw new RecursoNoEncontrado('La cuenta');
  return cuenta;
}
