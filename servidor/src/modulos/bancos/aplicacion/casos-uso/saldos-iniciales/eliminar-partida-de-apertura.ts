import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { motivoValido } from '../../../dominio/nuevo-movimiento.js';
import { movimientoExistente } from '../movimientos/dependencias-de-movimientos.js';
import {
  abrirEscritura,
  partidaPorCambiar,
  RECURSO_DE_PARTIDAS,
  type DependenciasDeSaldosIniciales,
} from './dependencias-de-saldos-iniciales.js';

/** Elimina de verdad una partida (y su cheque de la chequera de apertura), con motivo y con la carga abierta. */
export class EliminarPartidaDeApertura {
  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {}

  /**
   * @throws RecursoNoEncontrado, MotivoDeAnulacionInvalido, MovimientoMarcadoEnConciliacion, MesConciliado,
   *   SinFechaDeInicio o CargaInicialCerrada.
   */
  ejecutar(
    operador: Operador,
    { cuentaBancariaId, movimientoId, motivo }: { cuentaBancariaId: string; movimientoId: string; motivo: string },
  ): Promise<void> {
    const motivoLimpio = motivoValido(motivo);
    const { unidadDeTrabajo, repositorioMovimientos, reglas, chequesDeApertura, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await abrirEscritura(this.dependencias, operador, cuentaBancariaId);
      const { base, dto } = await partidaPorCambiar(this.dependencias, operador, { cuentaBancariaId, movimientoId });
      const movimiento = await movimientoExistente(repositorioMovimientos, movimientoId);
      movimiento.exigirNoMarcadoEnConciliacion(base.conciliacionId);
      await reglas.revisar(operador, { cuentaBancariaId, fechas: [base.fecha], diferencia: 0 });
      await auditoria.registrar({
        recurso: RECURSO_DE_PARTIDAS,
        registroId: movimientoId,
        accion: 'eliminar',
        anterior: dto,
        motivo: motivoLimpio,
      });
      await chequesDeApertura.liberar(movimientoId);
      await repositorioMovimientos.eliminar(Identificador.desde(movimientoId));
    });
  }
}
