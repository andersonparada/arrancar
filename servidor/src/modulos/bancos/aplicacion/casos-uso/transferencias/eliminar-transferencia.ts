import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Movimiento } from '../../../dominio/movimiento.js';
import type { TransferenciaDto } from '../../dto/transferencia.dto.js';
import { movimientoExistente } from '../movimientos/dependencias-de-movimientos.js';
import { transferenciaExistente, type DependenciasDeTransferencias } from './dependencias-de-transferencias.js';

interface EliminacionDeTransferencia {
  transferenciaId: string;
  motivo: string;
}

interface NotasDeLaTransferencia {
  origen: Movimiento;
  destino: Movimiento;
}

/**
 * Elimina de verdad la transferencia y sus dos notas, solo si las dos están limpias: ninguna
 * marcada en una conciliación, con fecha fuera de un mes conciliado, y ninguna revierte ni fue
 * revertida. Queda en la auditoría tal como estaba.
 */
export class EliminarTransferencia {
  constructor(private readonly dependencias: DependenciasDeTransferencias) {}

  /**
   * @throws NoSeEliminaUnInverso o NoSeEliminaUnMovimientoRevertido si alguna nota no está limpia por su historia.
   * @throws MovimientoMarcadoEnConciliacion si alguna nota está marcada en una conciliación.
   * @throws MesConciliado si la fecha cae en un mes ya conciliado de alguna de las dos cuentas.
   * @throws SaldoInsuficiente si al quitarla alguna cuenta queda en negativo sin sobregiro permitido.
   */
  ejecutar(operador: Operador, { transferenciaId, motivo }: EliminacionDeTransferencia): Promise<void> {
    const { unidadDeTrabajo, repositorio, repositorioMovimientos, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const transferencia = await transferenciaExistente(repositorio, transferenciaId);
      const anterior = await consultas.obtener(transferenciaId);
      const notas = await this.notasDe(anterior);

      this.exigirLimpias(notas, anterior);
      await this.revisarReglas(operador, anterior, notas);
      await repositorioMovimientos.eliminar(notas.origen.id);
      await repositorioMovimientos.eliminar(notas.destino.id);
      await repositorio.eliminar(transferencia.id);
      await auditoria.registrar({
        recurso: 'bancos.transferencias',
        registroId: transferenciaId,
        accion: 'eliminar',
        anterior,
        motivo,
      });
    });
  }

  private async notasDe(transferencia: TransferenciaDto): Promise<NotasDeLaTransferencia> {
    const { repositorioMovimientos } = this.dependencias;
    return {
      origen: await movimientoExistente(repositorioMovimientos, transferencia.movimientoOrigenId),
      destino: await movimientoExistente(repositorioMovimientos, transferencia.movimientoDestinoId),
    };
  }

  private exigirLimpias({ origen, destino }: NotasDeLaTransferencia, transferencia: TransferenciaDto): void {
    origen.exigirEliminable();
    destino.exigirEliminable();
    origen.exigirNoMarcadoEnConciliacion(transferencia.conciliacionOrigenId);
    destino.exigirNoMarcadoEnConciliacion(transferencia.conciliacionDestinoId);
  }

  private async revisarReglas(
    operador: Operador,
    transferencia: TransferenciaDto,
    { origen, destino }: NotasDeLaTransferencia,
  ): Promise<void> {
    const { reglas } = this.dependencias;
    const fechas = [transferencia.fecha];
    await reglas.revisar(operador, {
      cuentaBancariaId: transferencia.cuentaOrigenId,
      fechas,
      diferencia: -origen.efectoEnCentavos,
    });
    await reglas.revisar(operador, {
      cuentaBancariaId: transferencia.cuentaDestinoId,
      fechas,
      diferencia: -destino.efectoEnCentavos,
    });
  }
}
