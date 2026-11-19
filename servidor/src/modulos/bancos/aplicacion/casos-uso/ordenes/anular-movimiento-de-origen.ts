import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { OrdenesEntreModulos } from '../../../../core/contratos/mediador.contratos.js';
import { nombreDelModulo } from '../../../dominio/conceptos-reservados.js';
import type { ConsultasMovimientos } from '../../puertos/consultas-movimientos.js';
import type { RepositorioMovimientos } from '../../puertos/repositorio-movimientos.js';
import type { AnularCheque } from '../cheques/anular-cheque.js';
import type { AnularMovimiento } from '../movimientos/anular-movimiento.js';

type Orden = OrdenesEntreModulos['bancos.anular_movimiento_de_origen'];

export interface DependenciasDeAnularMovimientoDeOrigen {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasMovimientos;
  repositorio: RepositorioMovimientos;
  anularCheque: AnularCheque;
  anularMovimiento: AnularMovimiento;
}

/**
 * La orden `bancos.anular_movimiento_de_origen`: anula el cheque (a la antigua o con inverso, según su mes) o la nota
 * (con inverso) que creó el módulo que lo pide, con los mismos casos de uso y reglas que la pantalla de Bancos. No le
 * devuelve el aviso: ya hizo lo suyo.
 */
export class AnularMovimientoDeOrigen {
  constructor(private readonly dependencias: DependenciasDeAnularMovimientoDeOrigen) {}

  /** @throws OrigenDelMovimientoNoCoincide si el movimiento no es del documento que lo pide. */
  ejecutar(operador: Operador, datos: Orden['datos']): Promise<Orden['respuesta']> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await this.anular(operador, datos);
      const anulado = await consultas.obtener(datos.movimientoId);
      if (anulado.anuladoEn) return { forma: 'sin_inverso', inversoId: null };
      const inverso = await this.dependencias.repositorio.buscarInversoDe(Identificador.desde(datos.movimientoId));
      return { forma: 'con_inverso', inversoId: inverso?.id.valor ?? null };
    });
  }

  private async anular(operador: Operador, { origen, movimientoId, motivo, fecha }: Orden['datos']): Promise<void> {
    const { consultas, anularCheque, anularMovimiento } = this.dependencias;
    const movimiento = await consultas.obtener(movimientoId);
    const rotulado = `Anulado desde ${nombreDelModulo(origen.modulo)}: ${motivo}`;
    const pedido = { motivo: rotulado, fecha, pedidoPor: origen };
    if (movimiento.chequeId) await anularCheque.ejecutar(operador, { ...pedido, chequeId: movimiento.chequeId });
    else await anularMovimiento.ejecutar(operador, { ...pedido, movimientoId });
  }
}
