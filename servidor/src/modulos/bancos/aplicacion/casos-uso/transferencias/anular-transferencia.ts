import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Movimiento } from '../../../dominio/movimiento.js';
import type { Transferencia } from '../../../dominio/transferencia.js';
import { movimientoExistente } from '../movimientos/dependencias-de-movimientos.js';
import type { TransferenciaDto } from '../../dto/transferencia.dto.js';
import { transferenciaExistente, type DependenciasDeTransferencias } from './dependencias-de-transferencias.js';

interface AnulacionDeTransferencia {
  transferenciaId: string;
  motivo: string;
}

interface NotasDeLaTransferencia {
  origen: Movimiento;
  destino: Movimiento;
}

/** Anula la transferencia y sus dos notas; queda en la auditoría tal como estaba. */
export class AnularTransferencia {
  constructor(private readonly dependencias: DependenciasDeTransferencias) {}

  /**
   * @throws TransferenciaAnulada si ya estaba anulada; MotivoDeAnulacionInvalido si falta el motivo.
   * @throws SaldoInsuficiente si al quitar el crédito el destino queda en negativo sin sobregiro permitido.
   */
  ejecutar(operador: Operador, { transferenciaId, motivo }: AnulacionDeTransferencia): Promise<TransferenciaDto> {
    const { unidadDeTrabajo, repositorio, repositorioMovimientos, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const transferencia = await transferenciaExistente(repositorio, transferenciaId);
      const anterior = await consultas.obtener(transferenciaId);
      const notas: NotasDeLaTransferencia = {
        origen: await movimientoExistente(repositorioMovimientos, anterior.movimientoOrigenId),
        destino: await movimientoExistente(repositorioMovimientos, anterior.movimientoDestinoId),
      };

      const efectos = { origen: notas.origen.efectoEnCentavos, destino: notas.destino.efectoEnCentavos };
      const fechas = [notas.destino.instantanea().fecha];
      this.anularEntidades(transferencia, notas, motivo);
      await this.revisarReglas(operador, { anterior, efectos, fechas });
      await this.guardarTodo(transferencia, notas);
      await this.auditar(transferenciaId, anterior, transferencia.instantanea().motivoDeAnulacion);
      return consultas.obtener(transferenciaId);
    });
  }

  private anularEntidades(
    transferencia: Transferencia,
    { origen, destino }: NotasDeLaTransferencia,
    motivo: string,
  ): void {
    transferencia.anular(motivo);
    origen.anularPorTransferencia(motivo);
    destino.anularPorTransferencia(motivo);
  }

  private async revisarReglas(
    operador: Operador,
    contexto: { anterior: TransferenciaDto; efectos: { origen: number; destino: number }; fechas: string[] },
  ): Promise<void> {
    const { reglas } = this.dependencias;
    const { anterior, efectos, fechas } = contexto;
    await reglas.revisar(operador, { cuentaBancariaId: anterior.cuentaOrigenId, fechas, diferencia: -efectos.origen });
    await reglas.revisar(operador, {
      cuentaBancariaId: anterior.cuentaDestinoId,
      fechas,
      diferencia: -efectos.destino,
    });
  }

  private async guardarTodo(transferencia: Transferencia, { origen, destino }: NotasDeLaTransferencia): Promise<void> {
    const { repositorio, repositorioMovimientos } = this.dependencias;
    await repositorio.guardar(transferencia);
    await repositorioMovimientos.guardar(origen);
    await repositorioMovimientos.guardar(destino);
  }

  private async auditar(transferenciaId: string, anterior: TransferenciaDto, motivo: string | null): Promise<void> {
    await this.dependencias.auditoria.registrar({
      recurso: 'bancos.transferencias',
      registroId: transferenciaId,
      accion: 'anular',
      anterior,
      motivo,
    });
  }
}
