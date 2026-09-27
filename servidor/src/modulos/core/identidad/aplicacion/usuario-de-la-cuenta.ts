import { RecursoNoEncontrado } from '../../compartido/aplicacion/errores.js';
import type { Operador } from '../../compartido/aplicacion/operador.js';
import { Identificador } from '../../compartido/dominio/identificador.js';
import { exigirEmpresasSinRepetir, type AccesoAEmpresa } from '../dominio/acceso-a-empresa.js';
import { EmpresaAjena, RolAjeno } from '../dominio/errores.js';
import type { Pertenencia, Usuario } from '../dominio/usuario.js';
import type { AccesosAEmpresas } from './puertos/accesos-a-empresas.js';
import type { RepositorioUsuarios } from './puertos/repositorio-usuarios.js';

export interface UsuarioAdministrado {
  usuario: Usuario;
  pertenencia: Pertenencia;
}

/**
 * El usuario, si trabaja en alguna empresa de la cuenta del operador.
 * @throws RecursoNoEncontrado si no existe, es de soporte o no trabaja en la cuenta.
 */
export async function usuarioDeLaCuenta(
  repositorio: RepositorioUsuarios,
  usuarioId: string,
  operador: Operador,
): Promise<UsuarioAdministrado> {
  const usuario = await repositorio.buscar(Identificador.desde(usuarioId));
  const cuentas = usuario ? await repositorio.cuentasDe(usuario.id) : [];
  if (!usuario || usuario.esSuperacceso || !cuentas.includes(operador.cuentaId)) {
    throw new RecursoNoEncontrado('El usuario');
  }
  return {
    usuario,
    pertenencia: { esElMismo: usuarioId === operador.usuarioId, soloEnEstaCuenta: cuentas.length === 1 },
  };
}

/** @throws EmpresaRepetida, EmpresaAjena o RolAjeno si algún acceso no es válido para la cuenta. */
export async function exigirAccesosDeLaCuenta(
  accesos: AccesosAEmpresas,
  cuentaId: string,
  solicitados: readonly AccesoAEmpresa[],
): Promise<void> {
  exigirEmpresasSinRepetir(solicitados);
  const [empresas, roles] = await Promise.all([
    accesos.empresasDeLaCuenta(cuentaId),
    accesos.rolesDeLaCuenta(cuentaId),
  ]);
  if (solicitados.some((acceso) => !empresas.has(acceso.empresaId))) throw new EmpresaAjena();
  if (solicitados.some((acceso) => !roles.has(acceso.rolId))) throw new RolAjeno();
}
