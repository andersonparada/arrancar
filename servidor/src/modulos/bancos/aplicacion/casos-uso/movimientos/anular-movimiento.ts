import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { numerarSiCorresponde } from '../../numeracion-de-comprobantes.js';
import type { MovimientoDto } from '../../dto/movimiento.dto.js';
import type { PoliticaDeMismaFechaEnAnulacion } from '../../puertos/politica-de-misma-fecha-en-anulacion.js';
import { movimientoExistente, type DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

/** Lo que usa `AnularMovimiento`: lo de los movimientos, más la política de misma fecha. */
export interface DependenciasDeAnularMovimiento extends DependenciasDeMovimientos {
  politicaDeMismaFecha: PoliticaDeMismaFechaEnAnulacion;
}

interface AnulacionDeMovimiento {
  movimientoId: string;
  motivo: string;
  /** La fecha del inverso; la escribe el usuario, por omisión hoy. No puede ser anterior a la del original. */
  fecha?: string;
}

const AUDITORIA = { recurso: 'bancos.movimientos', accion: 'anular' } as const;

const hoy = (): string => new Date().toISOString().slice(0, 10);

/**
 * Anula una nota suelta: crea su movimiento inverso (crédito ↔ débito), enlazado al original, que
 * queda marcado «revertido». Nada se borra. Queda en la auditoría tal como estaba.
 */
export class AnularMovimiento {
  constructor(private readonly dependencias: DependenciasDeAnularMovimiento) {}

  /**
   * @throws MovimientoAnulado o MovimientoYaRevertido si ya no estaba vigente; MotivoDeAnulacionInvalido si falta el motivo.
   * @throws MovimientoDeTransferencia o MovimientoDeCheque si no es una nota suelta; NoEsUnaNota si es el saldo inicial.
   * @throws FechaDeReversionAnterior si la fecha del inverso es anterior a la del original.
   * @throws SaldoInsuficiente si el inverso deja la cuenta en negativo sin sobregiro permitido.
   */
  ejecutar(operador: Operador, { movimientoId, motivo, fecha }: AnulacionDeMovimiento): Promise<MovimientoDto> {
    const { unidadDeTrabajo, repositorio, consultas, reglas, auditoria, correlativos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const movimiento = await movimientoExistente(repositorio, movimientoId);
      movimiento.exigirClase(false);
      const anterior = await consultas.obtener(movimientoId);
      const fechaDelInverso = await this.fechaDelInverso(operador, anterior, fecha);
      const inverso = movimiento.revertir(fechaDelInverso, motivo);
      const { cuentaBancariaId, motivoDeReversion } = movimiento.instantanea();
      await reglas.revisar(operador, {
        cuentaBancariaId,
        fechas: [fechaDelInverso],
        diferencia: inverso.efectoEnCentavos,
      });
      await numerarSiCorresponde(correlativos, inverso);
      await repositorio.guardar(movimiento);
      await repositorio.agregar(inverso);
      await auditoria.registrar({ ...AUDITORIA, registroId: movimientoId, anterior, motivo: motivoDeReversion });
      return consultas.obtener(movimientoId);
    });
  }

  /**
   * Por omisión, la fecha del inverso es la que escribió el usuario (hoy si no escribió ninguna).
   * Con `bancos.anulaciones.misma_fecha` activa y el mes del original sin conciliar, se usa la
   * fecha del original en su lugar.
   */
  private async fechaDelInverso(operador: Operador, original: MovimientoDto, fechaEscrita?: string): Promise<string> {
    const { consultas, politicaDeMismaFecha } = this.dependencias;
    const conciliadaHasta = await consultas.conciliadaHasta(original.cuentaBancariaId);
    const mesDelOriginalConciliado = conciliadaHasta !== null && original.fecha <= conciliadaHasta;
    if (!mesDelOriginalConciliado && (await politicaDeMismaFecha.aplica(operador))) return original.fecha;
    return fechaEscrita ?? hoy();
  }
}
