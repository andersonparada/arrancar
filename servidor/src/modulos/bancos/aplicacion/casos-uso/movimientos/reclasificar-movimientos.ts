import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { exigirConceptoElegible } from '../../../dominio/asignacion-de-concepto.js';
import type { Concepto } from '../../../dominio/concepto.js';
import {
  CantidadInvalidaParaReclasificar,
  MAXIMO_DE_MOVIMIENTOS_A_RECLASIFICAR,
} from '../../../dominio/errores-de-conceptos.js';
import type { Movimiento } from '../../../dominio/movimiento.js';
import type { ResultadoDeReclasificacion, SolicitudDeReclasificacion } from '../../dto/movimiento.dto.js';
import { movimientoExistente, type DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

type Dependencias = Pick<
  DependenciasDeMovimientos,
  'unidadDeTrabajo' | 'repositorio' | 'consultas' | 'auditoria' | 'conceptos'
>;

/**
 * Cambia solo el concepto de uno o varios movimientos (hasta 200, todo o nada): es la bandeja «Sin clasificar».
 * Procede también en meses conciliados, porque no toca dinero ni fechas. Cada cambio queda en la auditoría
 * como `corregir` (concepto anterior y nuevo) y el inverso de un movimiento revertido lo sigue.
 */
export class ReclasificarMovimientos {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws CantidadInvalidaParaReclasificar si son 0 o más de 200.
   * @throws NoSeReclasificaUnInverso, NoSeReclasificaUnaTransferencia o NoSeReclasificaElSaldoInicial.
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
      for (const id of ids) if (await this.reclasificar(id, concepto)) reclasificados += 1;
      return { reclasificados, sinCambio: ids.length - reclasificados };
    });
  }

  /** @returns si el movimiento cambió de concepto (falso si ya lo tenía). */
  private async reclasificar(movimientoId: string, concepto: Concepto): Promise<boolean> {
    const { repositorio, consultas } = this.dependencias;
    const movimiento = await movimientoExistente(repositorio, movimientoId);
    const anterior = await consultas.obtener(movimientoId);
    const conceptoAnterior = movimiento.reclasificar(concepto.id.valor);
    exigirConceptoElegible(concepto.instantanea(), movimiento.instantanea().tipo);
    if (conceptoAnterior === concepto.id.valor) return false;
    await repositorio.guardar(movimiento);
    await this.auditar(
      movimientoId,
      anterior,
      `Reclasificado de «${anterior.conceptoNombre}» a «${concepto.instantanea().nombre}»`,
    );
    await this.arrastrarAlInverso(movimiento, concepto);
    return true;
  }

  private async arrastrarAlInverso(original: Movimiento, concepto: Concepto): Promise<void> {
    const { repositorio, consultas } = this.dependencias;
    if (!original.estaRevertido) return;
    const inverso = await repositorio.buscarInversoDe(original.id);
    if (!inverso) return;
    const inversoId = inverso.id.valor;
    const anterior = await consultas.obtener(inversoId);
    inverso.seguirAlOriginal(concepto.id.valor);
    await repositorio.guardar(inverso);
    await this.auditar(
      inversoId,
      anterior,
      `Arrastrado por la reclasificación de su original a «${concepto.instantanea().nombre}»`,
    );
  }

  private auditar(registroId: string, anterior: unknown, motivo: string): Promise<void> {
    return this.dependencias.auditoria.registrar({
      recurso: 'bancos.movimientos',
      registroId,
      accion: 'corregir',
      anterior,
      motivo,
    });
  }
}
