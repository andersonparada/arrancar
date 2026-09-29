import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Concepto } from '../../../dominio/concepto.js';
import {
  CantidadInvalidaParaReclasificar,
  MAXIMO_DE_MOVIMIENTOS_A_RECLASIFICAR,
} from '../../../dominio/errores-de-conceptos.js';
import type { ResultadoDeReclasificacion, SolicitudDeReclasificacion } from '../../dto/movimiento.dto.js';
import type { DependenciasDeMovimientos } from './dependencias-de-movimientos.js';
import {
  ReclasificadorDeUnMovimiento,
  type ClaseDeReclasificacion,
  type DependenciasDelReclasificador,
} from './reclasificador-de-un-movimiento.js';

type Dependencias = DependenciasDelReclasificador & Pick<DependenciasDeMovimientos, 'unidadDeTrabajo'>;

/**
 * Cambia solo el concepto de uno o varios movimientos (hasta 200, todo o nada) a **un** concepto: es la bandeja
 * «Sin clasificar» y el «Reclasificar» del reporte. Procede también en meses conciliados, porque no toca dinero
 * ni fechas. Cada cambio queda en la auditoría como `corregir` (concepto anterior y nuevo) y el inverso de un
 * movimiento revertido lo sigue. `clase` dice quién pregunta: las notas o los cheques (cada uno con su permiso).
 */
export class ReclasificarMovimientos {
  private readonly reclasificador: ReclasificadorDeUnMovimiento;

  constructor(
    private readonly dependencias: Dependencias,
    private readonly clase: ClaseDeReclasificacion = 'notas',
  ) {
    this.reclasificador = new ReclasificadorDeUnMovimiento(dependencias);
  }

  /**
   * @throws CantidadInvalidaParaReclasificar si son 0 o más de 200.
   * @throws NoSeReclasificaUnInverso, NoSeReclasificaUnaTransferencia, NoSeReclasificaElSaldoInicial o
   *   NoSeReclasificaLoDeOtroModulo.
   * @throws UnChequeSeReclasificaComoCheque o NoEsUnChequeParaReclasificar según la clase.
   * @throws ConceptoDeSistemaNoSeElige, ConceptoInactivo o ConceptoIncompatible con el tipo de algún movimiento.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeReclasificacion): Promise<ResultadoDeReclasificacion> {
    const ids = [...new Set(solicitud.movimientoIds)];
    if (ids.length === 0 || ids.length > MAXIMO_DE_MOVIMIENTOS_A_RECLASIFICAR) {
      throw new CantidadInvalidaParaReclasificar();
    }
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const concepto = await this.dependencias.conceptos.existente(solicitud.conceptoId);
      let reclasificados = 0;
      for (const id of ids) if (await this.reclasificar(operador, id, concepto)) reclasificados += 1;
      return { reclasificados, sinCambio: ids.length - reclasificados };
    });
  }

  private reclasificar(operador: Operador, movimientoId: string, concepto: Concepto): Promise<boolean> {
    return this.reclasificador.reclasificar(operador, { movimientoId, concepto, clase: this.clase });
  }
}
