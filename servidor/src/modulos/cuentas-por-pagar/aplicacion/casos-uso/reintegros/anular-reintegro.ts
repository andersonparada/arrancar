import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { motivoValido } from '../../../dominio/ciclo-de-vida.js';
import type { Reintegro } from '../../../dominio/reintegros.js';
import type { ReintegroDto } from '../../dto/reintegros.dto.js';
import { MODULO_DE_ORIGEN } from '../pagos/orden-a-bancos.js';
import { AnuladorDelReintegro } from './anulador-del-reintegro.js';
import { reintegroBloqueado } from './bloqueo-del-reintegro.js';
import type { DependenciasDeReintegros } from './dependencias-de-reintegros.js';
import { LectorDelReintegro } from './lector-del-reintegro.js';

export interface PeticionParaAnularReintegro {
  reintegroId: string;
  motivo: string;
  /** `AAAA-MM-DD`: la fecha del inverso en Bancos; por omisión decide Bancos (hoy). No cuenta en efectivo. */
  fecha?: string;
}

/**
 * Anula un reintegro desde Cuentas por pagar (`reintegros.anular`): bloquea la nota de Bancos y el reintegro, revisa que
 * siga vigente, ordena a Bancos anular la nota de crédito del depósito (a la antigua o con inverso; si Bancos lanza, nada
 * cambia; el efectivo no tiene orden), lo deja `anulado` con su fecha contable, audita `anular` con el reintegro como estaba
 * y publica `reintegro_anulado` al confirmar.
 */
export class AnularReintegro {
  private readonly anulador: AnuladorDelReintegro;
  private readonly lector: LectorDelReintegro;

  constructor(private readonly dependencias: DependenciasDeReintegros) {
    this.anulador = new AnuladorDelReintegro(dependencias);
    this.lector = new LectorDelReintegro(dependencias);
  }

  /** @throws MotivoInvalido, RecursoNoEncontrado, ReintegroYaAnulado y lo que rechace Bancos (mes conciliado, nota conciliada). */
  async ejecutar(operador: Operador, pedido: PeticionParaAnularReintegro): Promise<ReintegroDto> {
    const motivo = motivoValido(pedido.motivo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const reintegro = await reintegroBloqueado(this.dependencias, pedido.reintegroId);
      this.anulador.revisar(reintegro);
      const enBancos = await this.anularEnBancos(operador, reintegro, { motivo, fecha: pedido.fecha });
      const eventos = await this.anulador.anular(operador, reintegro, { motivo, ...enBancos });
      const anulado = (await this.dependencias.reintegros.buscar(reintegro.id))!;
      return { dto: await this.lector.leer(anulado), eventos };
    });
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  /** El depósito pide a Bancos anular su nota de crédito; el efectivo no mueve nada allá. */
  private async anularEnBancos(
    operador: Operador,
    reintegro: Reintegro,
    { motivo, fecha }: { motivo: string; fecha: string | undefined },
  ) {
    if (reintegro.movimientoId === null) return { enBancos: null, fechaDelInverso: null };
    const hecha = await this.dependencias.bancos.anularMovimiento(operador, {
      origen: { modulo: MODULO_DE_ORIGEN, documentoId: reintegro.id },
      movimientoId: reintegro.movimientoId,
      motivo: `Anulado desde Cuentas por pagar: ${motivo}`,
      ...(fecha ? { fecha } : {}),
    });
    return { enBancos: hecha.forma, fechaDelInverso: hecha.fechaDelInverso };
  }
}
