import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { periodoDeLaFechaDeInicio } from '../dominio/apertura.js';
import type { Periodo } from '../dominio/conciliacion.js';
import type { CargaInicial } from './puertos/carga-inicial.js';
import type { ConsultasConciliaciones } from './puertos/consultas-conciliaciones.js';

interface Dependencias {
  consultas: ConsultasConciliaciones;
  cargaInicial: CargaInicial;
}

/**
 * El periodo de la primera conciliación de una cuenta con saldo del banco: el mes de la fecha de inicio de la empresa
 * (el del corte más un día). `null` si la cuenta no lo tiene: ahí la primera puede ser de cualquier mes.
 */
export async function periodoObligadoDeLaPrimera(
  operador: Operador,
  dependencias: Dependencias,
  cuentaBancariaId: string,
): Promise<Periodo | null> {
  const { consultas, cargaInicial } = dependencias;
  if (!(await consultas.conSaldoDelBanco(cuentaBancariaId))) return null;
  const { fechaDeInicio } = await cargaInicial.obtener(operador);
  return fechaDeInicio === null ? null : periodoDeLaFechaDeInicio(fechaDeInicio);
}

/**
 * El periodo que toca conciliar sin ninguna conciliación hecha: el de la fecha de inicio (con saldo del banco) o el
 * del primer movimiento vigente; `null` si no hay nada que conciliar.
 */
export async function periodoDeLaPrimera(
  operador: Operador,
  dependencias: Dependencias,
  cuentaBancariaId: string,
): Promise<Periodo | null> {
  const obligado = await periodoObligadoDeLaPrimera(operador, dependencias, cuentaBancariaId);
  if (obligado) return obligado;
  const fecha = await dependencias.consultas.fechaDelPrimerMovimiento(cuentaBancariaId);
  return fecha === null ? null : periodoDeLaFechaDeInicio(fecha);
}
