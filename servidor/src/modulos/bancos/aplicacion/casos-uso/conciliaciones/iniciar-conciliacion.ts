import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Conciliacion, finDelMesDe, periodoSiguiente } from '../../../dominio/conciliacion.js';
import {
  CuentaBancariaInactiva,
  HayUnaConciliacionAbierta,
  ConciliacionFueraDeOrden,
  MesNoHaTerminado,
} from '../../../dominio/errores.js';
import { PrimeraConciliacionDeOtroMes } from '../../../dominio/errores-de-apertura.js';
import { periodoObligadoDeLaPrimera } from '../../periodo-de-la-primera-conciliacion.js';
import type { ConciliacionDto, SolicitudDeInicioDeConciliacion } from '../../dto/conciliacion.dto.js';
import { documentoDeLaConciliacion, type DependenciasDeConciliaciones } from './dependencias-de-conciliaciones.js';

/**
 * Inicia una conciliación sin ningún saldo que escribir: la primera de la
 * cuenta puede ser de cualquier mes ya terminado (si se cargó con el saldo del banco, la del mes de la fecha de
 * inicio); las siguientes, del mes siguiente a la última, y solo si esa ya está autorizada. Los pares original +
 * inverso que nunca pasaron por el banco arrancan ya marcados.
 */
export class IniciarConciliacion {
  constructor(private readonly dependencias: DependenciasDeConciliaciones) {}

  /**
   * @throws CuentaBancariaInactiva si la cuenta está inactiva.
   * @throws MesNoHaTerminado si el mes elegido todavía no terminó.
   * @throws HayUnaConciliacionAbierta si la última de la cuenta no está autorizada.
   * @throws ConciliacionFueraDeOrden si el periodo no es el mes siguiente a la última.
   * @throws PrimeraConciliacionDeOtroMes si es la primera de una cuenta con saldo del banco y no es del mes de inicio.
   * @throws PeriodoInvalido si el año o el mes no son válidos.
   */
  ejecutar(operador: Operador, solicitud: SolicitudDeInicioDeConciliacion): Promise<ConciliacionDto> {
    const { unidadDeTrabajo, repositorio, consultasMovimientos } = this.dependencias;
    const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (!(await consultasMovimientos.cuentaEstaActiva(solicitud.cuentaBancariaId))) {
        throw new CuentaBancariaInactiva();
      }
      await this.exigirMesTerminado(operador, solicitud);
      await this.revisarOrden(operador, solicitud);
      const conciliacion = Conciliacion.crear(empresaId, solicitud);
      await repositorio.agregar(conciliacion);
      await this.marcarCompensados(conciliacion);
      return documentoDeLaConciliacion(operador, this.dependencias, conciliacion.id.valor);
    });
  }

  /**
   * Un original y su inverso que nunca pasaron por el banco arrancan marcados juntos: no son partidas en
   * tránsito, y así aparecen ya en la lista de marcados.
   */
  private async marcarCompensados(conciliacion: Conciliacion): Promise<void> {
    const { repositorio, consultas } = this.dependencias;
    const { cuentaBancariaId } = conciliacion.instantanea();
    const compensados = await consultas.paresCompensadosPendientes(
      cuentaBancariaId,
      conciliacion.finDelMes(),
      conciliacion.id.valor,
    );
    if (compensados.length > 0) await repositorio.guardarMarcas(conciliacion.id.valor, compensados);
  }

  private async exigirMesTerminado(operador: Operador, periodo: { anio: number; mes: number }): Promise<void> {
    const hoy = await this.dependencias.reloj.hoy(operador);
    if (finDelMesDe(periodo) >= hoy) throw new MesNoHaTerminado();
  }

  private async revisarOrden(operador: Operador, solicitud: SolicitudDeInicioDeConciliacion): Promise<void> {
    const { repositorio } = this.dependencias;
    const ultima = await repositorio.ultimaDeLaCuenta(solicitud.cuentaBancariaId);
    if (!ultima) return this.revisarLaPrimera(operador, solicitud);
    if (ultima.estado !== 'autorizada') throw new HayUnaConciliacionAbierta();
    const esperado = periodoSiguiente({ anio: ultima.anio, mes: ultima.mes });
    if (solicitud.anio !== esperado.anio || solicitud.mes !== esperado.mes) {
      throw new ConciliacionFueraDeOrden(esperado);
    }
  }

  /** La primera de una cuenta con saldo del banco es la del mes de la fecha de inicio (§2.4). */
  private async revisarLaPrimera(operador: Operador, solicitud: SolicitudDeInicioDeConciliacion): Promise<void> {
    const obligado = await periodoObligadoDeLaPrimera(operador, this.dependencias, solicitud.cuentaBancariaId);
    if (obligado && (obligado.anio !== solicitud.anio || obligado.mes !== solicitud.mes)) {
      throw new PrimeraConciliacionDeOtroMes(`${String(obligado.mes).padStart(2, '0')}/${obligado.anio}`);
    }
  }
}
