import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { OrdenesEntreModulos } from '../../../../core/contratos/mediador.contratos.js';
import { MovimientoAnulado, MovimientoYaRevertido } from '../../../dominio/errores.js';
import { NotaNoMarcada, OrigenDelMovimientoNoCoincide } from '../../../dominio/errores-de-origen.js';
import type { DesgloseDeMovimientos } from '../../desglose-de-movimientos.js';
import type { MovimientoDto } from '../../dto/movimiento.dto.js';
import type { ConsultasMovimientos } from '../../puertos/consultas-movimientos.js';
import type { RepositorioMovimientos } from '../../puertos/repositorio-movimientos.js';
import { movimientoExistente } from '../movimientos/dependencias-de-movimientos.js';

type Orden = OrdenesEntreModulos['bancos.fijar_desglose_de_conceptos'];

export interface DependenciasDeFijarDesglose {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasMovimientos;
  repositorio: RepositorioMovimientos;
  desglose: DesgloseDeMovimientos;
}

/**
 * La orden `bancos.fijar_desglose_de_conceptos`: reemplaza el reparto por concepto de un movimiento con origen del
 * módulo que lo pide o de una nota marcada. Solo clasifica el flujo: no cambia el monto, la fecha ni la conciliación.
 * Es idempotente. No deja rastro propio: el pago que lo origina se audita en su módulo.
 */
export class FijarDesgloseDeConceptos {
  constructor(private readonly dependencias: DependenciasDeFijarDesglose) {}

  /**
   * @throws MovimientoAnulado o MovimientoYaRevertido si ya no está vigente.
   * @throws OrigenDelMovimientoNoCoincide si no es del documento que lo pide; NotaNoMarcada si se pidió sin origen y
   *   no es una nota marcada.
   * @throws DesgloseSinLineas, ConceptoDeDesgloseIncompatible o DesgloseNoSuma si las líneas no sirven.
   */
  ejecutar(operador: Operador, datos: Orden['datos']): Promise<Orden['respuesta']> {
    const { unidadDeTrabajo, consultas, desglose } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const dto = await consultas.obtener(datos.movimientoId);
      this.exigirQueSePuedaFijar(dto, datos);
      const reparto = await desglose.resolver(operador, { tipo: dto.tipo, monto: dto.monto, lineas: datos.conceptos });
      const conceptoDelMovimientoId = datos.origen ? reparto.principalId : dto.conceptoId;
      if (datos.origen) await this.fijarElConcepto(datos.movimientoId, reparto.principalId);
      const conDesglose = await desglose.guardar(operador, { movimientoId: dto.id, conceptoDelMovimientoId, reparto });
      return { conDesglose };
    });
  }

  private exigirQueSePuedaFijar(dto: MovimientoDto, { origen }: Orden['datos']): void {
    if (dto.anuladoEn) throw new MovimientoAnulado();
    if (dto.revertidoEn) throw new MovimientoYaRevertido();
    if (!origen) {
      if (!dto.marcadaParaModulo) throw new NotaNoMarcada();
      return;
    }
    if (dto.moduloDeOrigen !== origen.modulo || dto.documentoDeOrigenId !== origen.documentoId) {
      throw new OrigenDelMovimientoNoCoincide();
    }
  }

  /** En un movimiento con origen, el concepto de las listas es el de mayor monto; su inverso lo sigue. */
  private async fijarElConcepto(movimientoId: string, conceptoId: string): Promise<void> {
    const { repositorio } = this.dependencias;
    const movimiento = await movimientoExistente(repositorio, movimientoId);
    movimiento.fijarConceptoDelReparto(conceptoId);
    await repositorio.guardar(movimiento);
    const inverso = movimiento.estaRevertido
      ? await repositorio.buscarInversoDe(Identificador.desde(movimientoId))
      : null;
    if (!inverso) return;
    inverso.seguirAlOriginal(conceptoId);
    await repositorio.guardar(inverso);
  }
}
