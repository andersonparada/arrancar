import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { exigirConceptoElegible, type TipoDeMovimiento } from '../../../dominio/asignacion-de-concepto.js';
import type { Concepto } from '../../../dominio/concepto.js';
import {
  NoEsUnChequeParaReclasificar,
  UnChequeSeReclasificaComoCheque,
} from '../../../dominio/errores-de-conceptos.js';
import { NotaMarcadaConDesglose } from '../../../dominio/errores-de-origen.js';
import type { Movimiento } from '../../../dominio/movimiento.js';
import type { MovimientoDto } from '../../dto/movimiento.dto.js';
import type { ModulosDeOrigen } from '../../puertos/modulos-de-origen.js';
import { movimientoExistente, type DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

export type DependenciasDelReclasificador = Pick<
  DependenciasDeMovimientos,
  'repositorio' | 'consultas' | 'auditoria' | 'conceptos' | 'revisor'
> & { modulosDeOrigen: ModulosDeOrigen };

/**
 * Quién pide la reclasificación: las notas (y la bandeja «Sin clasificar», que también trae cheques pendientes)
 * o los cheques (con el permiso de los cheques, incluso ya clasificados).
 */
export type ClaseDeReclasificacion = 'notas' | 'cheques';

export interface PedidoDeReclasificacion {
  movimientoId: string;
  concepto: Concepto;
  clase: ClaseDeReclasificacion;
  /** El concepto lo eligió la persona al aceptar una sugerencia: queda dicho en el motivo de la auditoría. */
  porSugerencia?: boolean;
}

export const SUFIJO_DE_SUGERENCIA_ACEPTADA = ' (sugerencia aceptada)';

const CLAVE_SIN_CLASIFICAR = 'sin_clasificar';

/**
 * El paso por movimiento de toda reclasificación (`ReclasificarMovimientos` y `ReclasificarVarios`): cambia el
 * concepto, audita como `corregir` (el movimiento como estaba) y arrastra al inverso. Corre dentro de la unidad
 * de trabajo de quien lo llama.
 */
export class ReclasificadorDeUnMovimiento {
  constructor(private readonly dependencias: DependenciasDelReclasificador) {}

  /** @returns si el movimiento cambió de concepto (falso si ya lo tenía). */
  async reclasificar(operador: Operador, pedido: PedidoDeReclasificacion): Promise<boolean> {
    const { repositorio, consultas } = this.dependencias;
    const { movimientoId, concepto, porSugerencia } = pedido;
    const movimiento = await movimientoExistente(repositorio, movimientoId);
    const anterior = await consultas.obtener(movimientoId);
    await this.exigirClase(pedido.clase, anterior);
    if (anterior.marcadaParaModulo && anterior.conceptoId !== concepto.id.valor) {
      await this.revisarNotaMarcada(operador, anterior);
    }
    const conceptoAnterior = movimiento.reclasificar(concepto.id.valor);
    await this.exigirConceptoElegible(operador, concepto, anterior.tipo);
    if (conceptoAnterior === concepto.id.valor) return false;
    await repositorio.guardar(movimiento);
    const sufijo = porSugerencia ? SUFIJO_DE_SUGERENCIA_ACEPTADA : '';
    const nombre = concepto.instantanea().nombre;
    await this.auditar(movimientoId, anterior, `Reclasificado de «${anterior.conceptoNombre}» a «${nombre}»${sufijo}`);
    await this.arrastrarAlInverso(movimiento, concepto);
    return true;
  }

  /** Una nota marcada con desglose no se reclasifica; sin él, Cuentas por pagar revisa que no esté ligada (CP4). */
  private async revisarNotaMarcada(operador: Operador, marcada: MovimientoDto): Promise<void> {
    if (marcada.desglose.length > 0) throw new NotaMarcadaConDesglose();
    await this.dependencias.revisor.revisar(operador, { movimiento: marcada, cambio: 'reclasificar' });
  }

  /** Las notas solo tocan notas y cheques pendientes; los cheques ya clasificados son del permiso de los cheques. */
  private async exigirClase(clase: ClaseDeReclasificacion, anterior: { tipo: string; conceptoId: string }) {
    const esCheque = anterior.tipo === 'cheque';
    if (clase === 'cheques' && !esCheque) throw new NoEsUnChequeParaReclasificar();
    if (clase === 'notas' && esCheque) {
      const actual = await this.dependencias.conceptos.existente(anterior.conceptoId);
      if (actual.instantanea().claveDeSistema !== CLAVE_SIN_CLASIFICAR) throw new UnChequeSeReclasificaComoCheque();
    }
  }

  /** Un concepto reservado por un módulo se puede elegir si ese módulo no está activo (P3, CCL-B1). */
  private async exigirConceptoElegible(operador: Operador, concepto: Concepto, tipo: TipoDeMovimiento) {
    const modulosActivos = await this.dependencias.modulosDeOrigen.activos(operador);
    exigirConceptoElegible(concepto.instantanea(), tipo, { modulosActivos });
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
