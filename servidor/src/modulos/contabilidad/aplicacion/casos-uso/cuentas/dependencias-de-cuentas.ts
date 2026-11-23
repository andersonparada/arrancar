import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Cuenta, UbicacionDeCuenta } from '../../../dominio/cuenta.js';
import { ContabilidadSinIniciar, CuentaInvalida } from '../../../dominio/errores.js';
import type { MascaraDeCuentas } from '../../../dominio/mascara-de-cuentas.js';
import type { ConsultasCuentas } from '../../puertos/consultas-cuentas.js';
import type { RepositorioCuentas } from '../../puertos/repositorio-cuentas.js';
import type { RepositorioInicios } from '../../puertos/repositorio-inicios.js';

/** Lo que usan los casos de uso de las cuentas. */
export interface DependenciasDeCuentas {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioCuentas;
  consultas: ConsultasCuentas;
  inicios: RepositorioInicios;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function cuentaExistente(repositorio: RepositorioCuentas, id: string): Promise<Cuenta> {
  const cuenta = await repositorio.buscar(Identificador.desde(id));
  if (!cuenta) throw new RecursoNoEncontrado('La cuenta');
  return cuenta;
}

/** @throws ContabilidadSinIniciar si la empresa todavía no definió su máscara de códigos. */
export async function mascaraDeLaEmpresa(inicios: RepositorioInicios): Promise<MascaraDeCuentas> {
  const inicio = await inicios.obtener('compartido');
  if (!inicio) throw new ContabilidadSinIniciar();
  return inicio.mascara;
}

/**
 * La cuenta superior de un código nuevo: la que lleva el código sin su último grupo.
 * @throws CuentaInvalida si el código pide una cuenta superior que no existe.
 */
export async function ubicacionDeCuentaNueva(
  { repositorio, inicios }: Pick<DependenciasDeCuentas, 'repositorio' | 'inicios'>,
  codigo: string,
): Promise<UbicacionDeCuenta> {
  const mascara = await mascaraDeLaEmpresa(inicios);
  mascara.nivelDe(codigo.trim());
  const codigoDelPadre = mascara.codigoDelPadre(codigo.trim());
  const padre = codigoDelPadre ? await repositorio.buscarPorCodigoParaCompartir(codigoDelPadre) : null;
  if (codigoDelPadre && !padre) throw new CuentaInvalida(`Falta la cuenta superior ${codigoDelPadre}.`);
  return { mascara, padre };
}

/** La ubicación de una cuenta que ya existe: su cuenta superior es la que ya tiene. */
export async function ubicacionDeCuentaExistente(
  { repositorio, inicios }: Pick<DependenciasDeCuentas, 'repositorio' | 'inicios'>,
  cuenta: Cuenta,
): Promise<UbicacionDeCuenta> {
  const mascara = await mascaraDeLaEmpresa(inicios);
  const { padreId } = cuenta.instantanea();
  return { mascara, padre: padreId ? await repositorio.buscar(padreId) : null };
}
