import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Conciliacion, finDelMesDe, periodoSiguiente } from '../../../dominio/conciliacion.js';
import {
  CuentaBancariaInactiva,
  HayUnaConciliacionAbierta,
  ConciliacionFueraDeOrden,
  MesNoHaTerminado,
} from '../../../dominio/errores.js';
import type { ConciliacionDto, SolicitudDeInicioDeConciliacion } from '../../dto/conciliacion.dto.js';
import type { DependenciasDeConciliaciones } from './dependencias-de-conciliaciones.js';

/**
 * Inicia una conciliación sin ningún saldo que escribir: la primera de la
 * cuenta puede ser de cualquier mes ya terminado; las siguientes, del mes
 * siguiente a la última, y solo si esa ya está autorizada. Los pares original +
 * inverso que nunca pasaron por el banco arrancan ya marcados.
 */
export class IniciarConciliacion {
  constructor(private readonly dependencias: DependenciasDeConciliaciones) {}

  /**
   * @throws CuentaBancariaInactiva si la cuenta está inactiva.
   * @throws MesNoHaTerminado si el mes elegido todavía no terminó.
   * @throws HayUnaConciliacionAbierta si la última de la cuenta no está autorizada.
   * @throws ConciliacionFueraDeOrden si el periodo no es el mes siguiente a la última.
   * @throws PeriodoInvalido si el año o el mes no son válidos.
   */
  ejecutar(operador: Operador, solicitud: SolicitudDeInicioDeConciliacion): Promise<ConciliacionDto> {
    const { unidadDeTrabajo, repositorio, consultas, consultasMovimientos } = this.dependencias;
    const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (!(await consultasMovimientos.cuentaEstaActiva(solicitud.cuentaBancariaId))) {
        throw new CuentaBancariaInactiva();
      }
      await this.exigirMesTerminado(operador, solicitud);
      await this.revisarOrden(solicitud);
      const conciliacion = Conciliacion.crear(empresaId, solicitud);
      await repositorio.agregar(conciliacion);
      await this.marcarCompensados(conciliacion);
      return consultas.obtener(conciliacion.id.valor);
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

  private async revisarOrden(solicitud: SolicitudDeInicioDeConciliacion): Promise<void> {
    const { repositorio } = this.dependencias;
    const ultima = await repositorio.ultimaDeLaCuenta(solicitud.cuentaBancariaId);
    if (!ultima) return;
    if (ultima.estado !== 'autorizada') throw new HayUnaConciliacionAbierta();
    const esperado = periodoSiguiente({ anio: ultima.anio, mes: ultima.mes });
    if (solicitud.anio !== esperado.anio || solicitud.mes !== esperado.mes) {
      throw new ConciliacionFueraDeOrden(esperado);
    }
  }
}
