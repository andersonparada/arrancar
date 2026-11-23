import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { OrdenesEntreModulos } from '../../../../core/contratos/mediador.contratos.js';
import { nombreDelModulo } from '../../../dominio/conceptos-reservados.js';
import { motivoValido } from '../../../dominio/nuevo-movimiento.js';
import type { ConceptosDeMovimientos } from '../../conceptos-de-movimientos.js';
import type { DesgloseDeMovimientos } from '../../desglose-de-movimientos.js';
import type { ConsultasMovimientos } from '../../puertos/consultas-movimientos.js';
import type { RepositorioMovimientos } from '../../puertos/repositorio-movimientos.js';

type Orden = OrdenesEntreModulos['bancos.desligar_cheque_de_apertura'];

export interface DependenciasDeDesligarChequeDeApertura {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasMovimientos;
  repositorio: RepositorioMovimientos;
  desglose: DesgloseDeMovimientos;
  conceptos: ConceptosDeMovimientos;
  auditoria: Auditoria;
}

/**
 * La orden `bancos.desligar_cheque_de_apertura` (diseño CP-AP §2.7): quita el origen y el reparto del posfechado y lo
 * deja «Sin clasificar»; el concepto anterior queda en la auditoría del ligado. Deja rastro (`corregir` en
 * `bancos.cheques`) con el movimiento como estaba y el motivo.
 */
export class DesligarChequeDeApertura {
  constructor(private readonly dependencias: DependenciasDeDesligarChequeDeApertura) {}

  /**
   * @throws MotivoDeAnulacionInvalido si falta el motivo (hasta 500 letras).
   * @throws RecursoNoEncontrado si el movimiento no existe.
   * @throws OrigenDelMovimientoNoCoincide si no está ligado al documento que lo pide.
   * @throws MovimientoAnulado o MovimientoYaRevertido si ya no está vigente.
   */
  ejecutar(operador: Operador, datos: Orden['datos']): Promise<Orden['respuesta']> {
    const motivo = motivoValido(datos.motivo);
    const { unidadDeTrabajo, repositorio, consultas, desglose, conceptos, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const movimiento = await repositorio.bloquear(Identificador.desde(datos.movimientoId));
      if (!movimiento) throw new RecursoNoEncontrado('El movimiento');
      const anterior = await consultas.obtener(datos.movimientoId);
      const sinClasificar = await conceptos.deSistema(operador, 'sin_clasificar');
      movimiento.desligarChequeDeApertura(datos.origen, sinClasificar.id.valor);
      await repositorio.guardar(movimiento);
      await desglose.quitar(operador, anterior.id);
      const rotulo = `Desligado del pago ${datos.origen.documentoId} de ${nombreDelModulo(datos.origen.modulo)}: ${motivo}`;
      await auditoria.registrar({
        recurso: 'bancos.cheques',
        registroId: anterior.id,
        accion: 'corregir',
        anterior,
        motivo: rotulo,
      });
      return { conceptoId: sinClasificar.id.valor };
    });
  }
}
