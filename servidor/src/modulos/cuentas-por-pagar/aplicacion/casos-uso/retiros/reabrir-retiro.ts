import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { motivoValido } from '../../../dominio/ciclo-de-vida.js';
import type { RetiroDeEfectivo } from '../../../dominio/retiros.js';
import type { RetiroDto } from '../../dto/retiros.dto.js';
import { MODULO_DE_ORIGEN } from '../pagos/orden-a-bancos.js';
import { retiroBloqueado } from './bloqueo-del-retiro.js';
import type { DependenciasDeRetiros } from './dependencias-de-retiros.js';
import { LectorDelRetiro } from './lector-del-retiro.js';
import { ReabridorDelRetiro, type DatosDeReabrirElRetiro } from './reabridor-del-retiro.js';

export interface PeticionParaReabrirRetiro {
  retiroId: string;
  motivo: string;
  /** `AAAA-MM-DD`: la fecha del inverso del depósito en Bancos; por omisión decide Bancos (hoy). */
  fecha?: string;
}

/**
 * Reabre un retiro liquidado (`retiros.liquidar`): con su motivo, ordena a Bancos anular el depósito de la devolución (si lo
 * hubo; si Bancos lo rechaza, p. ej. por un mes conciliado, no se reabre), deja el retiro abierto sin devuelto ni faltante,
 * vuelve a fijar su reparto por concepto, audita `reabrir` y publica `retiro_reabierto` al confirmar.
 */
export class ReabrirRetiro {
  private readonly reabridor: ReabridorDelRetiro;
  private readonly lector: LectorDelRetiro;

  constructor(private readonly dependencias: DependenciasDeRetiros) {
    this.reabridor = new ReabridorDelRetiro(dependencias);
    this.lector = new LectorDelRetiro(dependencias);
  }

  /** @throws MotivoInvalido, RecursoNoEncontrado, RetiroYaAnulado, RetiroNoLiquidado y lo que rechace Bancos. */
  async ejecutar(operador: Operador, pedido: PeticionParaReabrirRetiro): Promise<RetiroDto> {
    const motivo = motivoValido(pedido.motivo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const retiro = await retiroBloqueado(this.dependencias, pedido.retiroId);
      this.reabridor.revisar(retiro);
      const anulacion = await this.anularElDeposito(operador, retiro, { motivo, fecha: pedido.fecha });
      const eventos = await this.reabridor.reabrir(operador, retiro, { motivo, ...anulacion });
      return { dto: await this.lector.leer(operador, (await this.dependencias.retiros.buscar(retiro.id))!), eventos };
    });
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  /** La orden a Bancos si el retiro tiene su depósito; si no, no hay nada que anular allá. */
  private async anularElDeposito(
    operador: Operador,
    retiro: RetiroDeEfectivo,
    { motivo, fecha }: { motivo: string; fecha?: string },
  ): Promise<Pick<DatosDeReabrirElRetiro, 'enBancos' | 'fechaDelInverso'>> {
    if (!retiro.movimientoDeDevolucionId) return { enBancos: null, fechaDelInverso: null };
    const hecha = await this.dependencias.bancos.anularMovimiento(operador, {
      origen: { modulo: MODULO_DE_ORIGEN, documentoId: retiro.id },
      movimientoId: retiro.movimientoDeDevolucionId,
      motivo: `Retiro reabierto desde Cuentas por pagar: ${motivo}`,
      ...(fecha ? { fecha } : {}),
    });
    return { enBancos: hecha.forma, fechaDelInverso: hecha.fechaDelInverso };
  }
}
