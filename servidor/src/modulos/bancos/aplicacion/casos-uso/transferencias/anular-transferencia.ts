import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { Movimiento } from '../../../dominio/movimiento.js';
import type { Transferencia } from '../../../dominio/transferencia.js';
import { movimientoExistente } from '../movimientos/dependencias-de-movimientos.js';
import type { TransferenciaDto } from '../../dto/transferencia.dto.js';
import type { PoliticaDeMismaFechaEnAnulacion } from '../../puertos/politica-de-misma-fecha-en-anulacion.js';
import { transferenciaExistente, type DependenciasDeTransferencias } from './dependencias-de-transferencias.js';

/** Lo que usa `AnularTransferencia`: lo de las transferencias, más la política de misma fecha. */
export interface DependenciasDeAnularTransferencia extends DependenciasDeTransferencias {
  politicaDeMismaFecha: PoliticaDeMismaFechaEnAnulacion;
  reloj: Reloj;
}

interface AnulacionDeTransferencia {
  transferenciaId: string;
  motivo: string;
  /** La fecha de los dos inversos; la escribe el usuario, por omisión hoy. */
  fecha?: string;
}

interface NotasDeLaTransferencia {
  origen: Movimiento;
  destino: Movimiento;
}

interface Inversos {
  origen: Movimiento;
  destino: Movimiento;
}

/**
 * Anula la transferencia: crea los dos inversos (uno en cada cuenta), enlazados a sus originales, y
 * marca la transferencia anulada. Nada se borra. Queda en la auditoría tal como estaba.
 */
export class AnularTransferencia {
  constructor(private readonly dependencias: DependenciasDeAnularTransferencia) {}

  /**
   * @throws TransferenciaAnulada si ya estaba anulada; MotivoDeAnulacionInvalido si falta el motivo.
   * @throws FechaDeReversionAnterior si la fecha de los inversos es anterior a la de la transferencia.
   * @throws SaldoInsuficiente si algún inverso deja su cuenta en negativo sin sobregiro permitido.
   */
  ejecutar(
    operador: Operador,
    { transferenciaId, motivo, fecha }: AnulacionDeTransferencia,
  ): Promise<TransferenciaDto> {
    const { unidadDeTrabajo, repositorio, repositorioMovimientos, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const transferencia = await transferenciaExistente(repositorio, transferenciaId);
      const anterior = await consultas.obtener(transferenciaId);
      const notas: NotasDeLaTransferencia = {
        origen: await movimientoExistente(repositorioMovimientos, anterior.movimientoOrigenId),
        destino: await movimientoExistente(repositorioMovimientos, anterior.movimientoDestinoId),
      };

      const fechaDeLosInversos = await this.fechaDeLosInversos(operador, anterior, fecha);
      const inversos = this.revertirEntidades(transferencia, notas, { motivo, fecha: fechaDeLosInversos });
      await this.revisarReglas(operador, { anterior, inversos, fecha: fechaDeLosInversos });
      await this.guardarTodo(transferencia, notas, inversos);
      await this.auditar(transferenciaId, anterior, transferencia.instantanea().motivoDeAnulacion);
      return consultas.obtener(transferenciaId);
    });
  }

  /** Misma fecha en ambos inversos, solo si ninguna de las dos cuentas tiene ya conciliado el mes de la transferencia. */
  private async fechaDeLosInversos(operador: Operador, anterior: TransferenciaDto, fechaEscrita?: string) {
    const { consultasMovimientos, politicaDeMismaFecha } = this.dependencias;
    const [conciliadaOrigen, conciliadaDestino] = await Promise.all([
      consultasMovimientos.conciliadaHasta(anterior.cuentaOrigenId),
      consultasMovimientos.conciliadaHasta(anterior.cuentaDestinoId),
    ]);
    const mesConciliado =
      (conciliadaOrigen !== null && anterior.fecha <= conciliadaOrigen) ||
      (conciliadaDestino !== null && anterior.fecha <= conciliadaDestino);
    if (!mesConciliado && (await politicaDeMismaFecha.aplica(operador))) return anterior.fecha;
    return fechaEscrita ?? (await this.dependencias.reloj.hoy(operador));
  }

  private revertirEntidades(
    transferencia: Transferencia,
    { origen, destino }: NotasDeLaTransferencia,
    { motivo, fecha }: { motivo: string; fecha: string },
  ): Inversos {
    transferencia.anular(motivo);
    return {
      origen: origen.revertirPorTransferencia(fecha, motivo),
      destino: destino.revertirPorTransferencia(fecha, motivo),
    };
  }

  private async revisarReglas(
    operador: Operador,
    { anterior, inversos, fecha }: { anterior: TransferenciaDto; inversos: Inversos; fecha: string },
  ): Promise<void> {
    const { reglas } = this.dependencias;
    const fechas = [fecha];
    await reglas.revisar(operador, {
      cuentaBancariaId: anterior.cuentaOrigenId,
      fechas,
      diferencia: inversos.origen.efectoEnCentavos,
    });
    await reglas.revisar(operador, {
      cuentaBancariaId: anterior.cuentaDestinoId,
      fechas,
      diferencia: inversos.destino.efectoEnCentavos,
    });
  }

  private async guardarTodo(
    transferencia: Transferencia,
    { origen, destino }: NotasDeLaTransferencia,
    inversos: Inversos,
  ): Promise<void> {
    const { repositorio, repositorioMovimientos } = this.dependencias;
    await repositorio.guardar(transferencia);
    await repositorioMovimientos.guardar(origen);
    await repositorioMovimientos.guardar(destino);
    await repositorioMovimientos.agregar(inversos.origen);
    await repositorioMovimientos.agregar(inversos.destino);
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
