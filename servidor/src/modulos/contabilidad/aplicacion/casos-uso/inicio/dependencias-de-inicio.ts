import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { CargaInicialAbierta, InicioInvalido } from '../../../dominio/errores.js';
import type { InicioContable } from '../../../dominio/inicio.js';
import type { InicioDto, SolicitudDeInicio } from '../../dto/inicio.dto.js';
import type { CargaInicial } from '../../puertos/carga-inicial.js';
import type { RepositorioCuentas } from '../../puertos/repositorio-cuentas.js';
import type { RepositorioInicios } from '../../puertos/repositorio-inicios.js';

/** Lo que usan los casos de uso del inicio de la contabilidad. */
export interface DependenciasDeInicio {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioInicios;
  cuentas: RepositorioCuentas;
  cargaInicial: CargaInicial;
  auditoria: Auditoria;
}

/** El inicio como lo ve el usuario. */
export function inicioADto(inicio: InicioContable): InicioDto {
  const { empresaId, ...datos } = inicio.instantanea();
  return datos;
}

/**
 * La fecha de inicio contable depende de la carga inicial de la empresa (§3.6): «desde la carga» es la fecha de inicio
 * de la empresa; «posterior» es una fecha después de ella y con la carga ya cerrada.
 * @throws InicioInvalido si la empresa no tiene fecha de inicio o la fecha no corresponde al caso.
 * @throws CargaInicialAbierta si el caso es «posterior» y la carga sigue abierta.
 */
export async function exigirFechaSegunLaCarga(
  cargaInicial: CargaInicial,
  operador: Operador,
  solicitud: SolicitudDeInicio,
): Promise<void> {
  const { fechaDeInicio, cerrada } = await cargaInicial.obtener(operador);
  if (!fechaDeInicio)
    throw new InicioInvalido('La empresa aún no tiene fecha de inicio: defínala en la carga inicial.');
  if (solicitud.caso === 'desde_la_carga') {
    if (solicitud.fecha !== fechaDeInicio)
      throw new InicioInvalido(
        `Desde la carga, la contabilidad empieza el ${fechaDeInicio}, fecha de inicio de la empresa.`,
      );
    return;
  }
  if (solicitud.fecha <= fechaDeInicio)
    throw new InicioInvalido(`Una fecha posterior debe ser después del ${fechaDeInicio}, inicio de la empresa.`);
  if (!cerrada) throw new CargaInicialAbierta();
}
