import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { RespuestaDeSugerencias } from '../../dto/sugerencia.dto.js';
import type { ConsultasDeSugerencias, FiltroDeSugerencias } from '../../puertos/consultas-de-sugerencias.js';
import type { PoliticaDeSugerencias } from '../../puertos/politica-de-sugerencias.js';
import type { MotorDeSugerencias } from '../../sugerencias/motor-de-sugerencias.js';

/** Los pendientes que se calculan a la vez; si hay más, se avisa y se pide acotar las fechas. */
export const MAXIMO_DE_PENDIENTES_CON_SUGERENCIA = 2000;

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultasDeSugerencias: ConsultasDeSugerencias;
  politicaDeSugerencias: PoliticaDeSugerencias;
  motor: MotorDeSugerencias;
}

/**
 * Sugiere el concepto de cada movimiento de la bandeja «Sin clasificar» (con los filtros de la bandeja). Solo lee:
 * la persona confirma aparte, con la reclasificación.
 */
export class SugerirConceptosDeSinClasificar {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, filtro: FiltroDeSugerencias): Promise<RespuestaDeSugerencias> {
    const { unidadDeTrabajo, consultasDeSugerencias, politicaDeSugerencias, motor } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const leidos = await consultasDeSugerencias.pendientes(filtro, MAXIMO_DE_PENDIENTES_CON_SUGERENCIA + 1);
      const pendientes = leidos.slice(0, MAXIMO_DE_PENDIENTES_CON_SUGERENCIA);
      const votaciones = await motor.sugerir(
        operador,
        pendientes.map((pendiente) => ({ pendiente, tipo: pendiente.tipo })),
      );
      const { confianzaMinima, vidaMediaDias } = await politicaDeSugerencias.parametros(operador);
      return {
        confianzaMinima,
        vidaMediaDias,
        truncado: leidos.length > pendientes.length,
        sugerencias: pendientes.map(({ id }, i) => ({ movimientoId: id, ...votaciones[i]! })),
      };
    });
  }
}
