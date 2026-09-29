import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  CantidadInvalidaParaReclasificar,
  MAXIMO_DE_MOVIMIENTOS_A_RECLASIFICAR,
} from '../../../dominio/errores-de-conceptos.js';
import type { ResultadoDeReclasificacion, SolicitudDeReclasificacionVarios } from '../../dto/movimiento.dto.js';
import type { DependenciasDeMovimientos } from './dependencias-de-movimientos.js';
import { ReclasificadorDeUnMovimiento, type DependenciasDelReclasificador } from './reclasificador-de-un-movimiento.js';

type Dependencias = DependenciasDelReclasificador & Pick<DependenciasDeMovimientos, 'unidadDeTrabajo'>;

/**
 * Aceptar sugerencias en lote (P7, §5.2): cada movimiento con **su** concepto, hasta 200 y todo o nada. Por cada
 * uno rigen las mismas reglas, la misma auditoría `corregir` y el mismo arrastre al inverso que en
 * `ReclasificarMovimientos`. El servidor no recalcula la sugerencia: la persona confirmó un concepto concreto por
 * movimiento y aquí solo se valida que se pueda asignar. Con `porSugerencia`, el motivo lo dice.
 */
export class ReclasificarVarios {
  private readonly reclasificador: ReclasificadorDeUnMovimiento;

  constructor(private readonly dependencias: Dependencias) {
    this.reclasificador = new ReclasificadorDeUnMovimiento(dependencias);
  }

  /**
   * @throws CantidadInvalidaParaReclasificar si son 0 o más de 200, o si un movimiento se repite.
   * @throws las mismas que `ReclasificarMovimientos`.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeReclasificacionVarios): Promise<ResultadoDeReclasificacion> {
    const { asignaciones, porSugerencia } = solicitud;
    const ids = new Set(asignaciones.map((asignacion) => asignacion.movimientoId));
    if (ids.size !== asignaciones.length || ids.size === 0 || ids.size > MAXIMO_DE_MOVIMIENTOS_A_RECLASIFICAR) {
      throw new CantidadInvalidaParaReclasificar();
    }
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      let reclasificados = 0;
      for (const { movimientoId, conceptoId } of asignaciones) {
        const concepto = await this.dependencias.conceptos.existente(conceptoId);
        const cambio = { movimientoId, concepto, clase: 'notas' as const, porSugerencia };
        if (await this.reclasificador.reclasificar(operador, cambio)) reclasificados += 1;
      }
      return { reclasificados, sinCambio: asignaciones.length - reclasificados };
    });
  }
}
