import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Movimiento } from '../../../dominio/movimiento.js';
import { numerarSiCorresponde } from '../../numeracion-de-comprobantes.js';
import type { ChequeDto } from '../../dto/cheque.dto.js';
import { movimientoExistente } from '../movimientos/dependencias-de-movimientos.js';
import { chequeExistente, type DependenciasDeCheques } from './dependencias-de-cheques.js';

interface AnulacionDeCheque {
  chequeId: string;
  motivo: string;
  /** Solo se usa si el mes del cheque ya está conciliado: la fecha de su nota inversa. Por omisión, hoy. */
  fecha?: string;
}

const hoy = (): string => new Date().toISOString().slice(0, 10);

/**
 * Anula el cheque, disponible o emitido; conserva su número: no se vuelve a usar. Si estaba emitido
 * y su mes sigue abierto, anula su movimiento a la antigua (sin inverso, fuera del saldo, como
 * siempre). Si su mes ya está conciliado (quedó en circulación y nunca se cobró), en cambio, crea
 * su nota de crédito inversa: el movimiento original sigue contando y el inverso lo compensa, así
 * no cambia ninguna conciliación ya autorizada.
 */
export class AnularCheque {
  constructor(private readonly dependencias: DependenciasDeCheques) {}

  /**
   * @throws ChequeAnulado si ya estaba anulado; MotivoDeAnulacionInvalido si falta el motivo.
   * @throws SaldoInsuficiente si al anularlo o revertirlo la cuenta queda en negativo sin sobregiro permitido.
   */
  ejecutar(operador: Operador, { chequeId, motivo, fecha }: AnulacionDeCheque): Promise<ChequeDto> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const cheque = await chequeExistente(repositorio, chequeId);
      const anterior = await consultas.obtener(chequeId);
      const { movimientoId } = cheque.instantanea();

      cheque.anular(motivo);
      if (movimientoId) await this.anularOrevertirSuMovimiento(operador, movimientoId, { motivo, fecha });
      await repositorio.guardar(cheque);

      await auditoria.registrar({
        recurso: 'bancos.cheques',
        registroId: chequeId,
        accion: 'anular',
        anterior,
        motivo: cheque.instantanea().motivoDeAnulacion,
      });
      return consultas.obtener(chequeId);
    });
  }

  private async anularOrevertirSuMovimiento(
    operador: Operador,
    movimientoId: string,
    { motivo, fecha }: { motivo: string; fecha?: string },
  ): Promise<void> {
    const { repositorioMovimientos, consultasMovimientos } = this.dependencias;
    const movimiento = await movimientoExistente(repositorioMovimientos, movimientoId);
    const { fecha: fechaDelCheque, cuentaBancariaId } = movimiento.instantanea();
    const conciliadaHasta = await consultasMovimientos.conciliadaHasta(cuentaBancariaId);
    const mesConciliado = conciliadaHasta !== null && fechaDelCheque <= conciliadaHasta;
    if (mesConciliado) await this.revertir(operador, movimiento, { motivo, fecha: fecha ?? hoy() });
    else await this.anularALaAntigua(operador, movimiento, motivo);
  }

  private async anularALaAntigua(operador: Operador, movimiento: Movimiento, motivo: string): Promise<void> {
    const { repositorioMovimientos, reglas } = this.dependencias;
    const efectoAnterior = movimiento.efectoEnCentavos;
    const { fecha, cuentaBancariaId } = movimiento.instantanea();
    movimiento.anularPorCheque(motivo);
    await reglas.revisar(operador, { cuentaBancariaId, fechas: [fecha], diferencia: -efectoAnterior });
    await repositorioMovimientos.guardar(movimiento);
  }

  private async revertir(
    operador: Operador,
    movimiento: Movimiento,
    { motivo, fecha }: { motivo: string; fecha: string },
  ): Promise<void> {
    const { repositorioMovimientos, reglas, correlativos } = this.dependencias;
    const inverso = movimiento.revertirPorCheque(fecha, motivo);
    const { cuentaBancariaId } = movimiento.instantanea();
    await reglas.revisar(operador, { cuentaBancariaId, fechas: [fecha], diferencia: inverso.efectoEnCentavos });
    await numerarSiCorresponde(correlativos, inverso);
    await repositorioMovimientos.guardar(movimiento);
    await repositorioMovimientos.agregar(inverso);
  }
}
