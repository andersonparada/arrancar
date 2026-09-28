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
 * siguiente a la última, y solo si esa ya está autorizada.
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
      this.exigirMesTerminado(solicitud);
      await this.revisarOrden(solicitud);
      const conciliacion = Conciliacion.crear(empresaId, solicitud);
      await repositorio.agregar(conciliacion);
      return consultas.obtener(conciliacion.id.valor);
    });
  }

  private exigirMesTerminado(periodo: { anio: number; mes: number }): void {
    const hoy = new Date().toISOString().slice(0, 10);
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
