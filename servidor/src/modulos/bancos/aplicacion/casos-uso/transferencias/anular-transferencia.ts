import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { movimientoExistente } from '../movimientos/dependencias-de-movimientos.js';
import type { TransferenciaDto } from '../../dto/transferencia.dto.js';
import { transferenciaExistente, type DependenciasDeTransferencias } from './dependencias-de-transferencias.js';

interface AnulacionDeTransferencia {
  transferenciaId: string;
  motivo: string;
}

/** Anula la transferencia y sus dos notas; queda en la auditoría tal como estaba. */
export class AnularTransferencia {
  constructor(private readonly dependencias: DependenciasDeTransferencias) {}

  /**
   * @throws TransferenciaAnulada si ya estaba anulada; MotivoDeAnulacionInvalido si falta el motivo.
   * @throws SaldoInsuficiente si al quitar el crédito el destino queda en negativo sin sobregiro permitido.
   */
  ejecutar(operador: Operador, { transferenciaId, motivo }: AnulacionDeTransferencia): Promise<TransferenciaDto> {
    const { unidadDeTrabajo, repositorio, repositorioMovimientos, consultas, reglas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const transferencia = await transferenciaExistente(repositorio, transferenciaId);
      const anterior = await consultas.obtener(transferenciaId);
      const origen = await movimientoExistente(repositorioMovimientos, anterior.movimientoOrigenId);
      const destino = await movimientoExistente(repositorioMovimientos, anterior.movimientoDestinoId);

      const efectoDelCredito = destino.efectoEnCentavos;
      transferencia.anular(motivo);
      origen.anularPorTransferencia(motivo);
      destino.anularPorTransferencia(motivo);
      await reglas.revisar(operador, { cuentaBancariaId: anterior.cuentaDestinoId, diferencia: -efectoDelCredito });

      await repositorio.guardar(transferencia);
      await repositorioMovimientos.guardar(origen);
      await repositorioMovimientos.guardar(destino);
      await auditoria.registrar({
        recurso: 'bancos.transferencias',
        registroId: transferenciaId,
        accion: 'anular',
        anterior,
        motivo: transferencia.instantanea().motivoDeAnulacion,
      });
      return consultas.obtener(transferenciaId);
    });
  }
}
