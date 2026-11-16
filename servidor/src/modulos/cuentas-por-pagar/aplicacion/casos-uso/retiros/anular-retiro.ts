import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { motivoValido } from '../../../dominio/ciclo-de-vida.js';
import type { RetiroDto } from '../../dto/retiros.dto.js';
import { MODULO_DE_ORIGEN } from '../pagos/orden-a-bancos.js';
import { AnuladorDelRetiro } from './anulador-del-retiro.js';
import { retiroBloqueado } from './bloqueo-del-retiro.js';
import type { DependenciasDeRetiros } from './dependencias-de-retiros.js';
import { LectorDelRetiro } from './lector-del-retiro.js';

export interface PeticionParaAnularRetiro {
  retiroId: string;
  motivo: string;
  /** `AAAA-MM-DD`: la fecha del inverso en Bancos; por omisión decide Bancos (hoy). */
  fecha?: string;
}

/**
 * Anula un retiro desde Cuentas por pagar (`retiros.anular`): bloquea el movimiento de Bancos y el retiro, revisa que esté
 * abierto, sin pagos vigentes y con el cheque sin cobrar, ordena a Bancos anular el cheque o la nota (a la antigua o con
 * inverso; si Bancos lanza, nada cambia), lo deja `anulado` con su fecha contable, audita `anular` con el retiro como estaba
 * y publica `retiro_anulado` al confirmar.
 */
export class AnularRetiro {
  private readonly anulador: AnuladorDelRetiro;
  private readonly lector: LectorDelRetiro;

  constructor(private readonly dependencias: DependenciasDeRetiros) {
    this.anulador = new AnuladorDelRetiro(dependencias);
    this.lector = new LectorDelRetiro(dependencias);
  }

  /** @throws MotivoInvalido, RecursoNoEncontrado, RetiroYaAnulado, RetiroLiquidado, RetiroConPagos, RetiroCobrado y lo que rechace Bancos. */
  async ejecutar(operador: Operador, pedido: PeticionParaAnularRetiro): Promise<RetiroDto> {
    const motivo = motivoValido(pedido.motivo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const retiro = await retiroBloqueado(this.dependencias, pedido.retiroId);
      await this.anulador.revisar(retiro);
      const hecha = await this.dependencias.bancos.anularMovimiento(operador, {
        origen: { modulo: MODULO_DE_ORIGEN, documentoId: retiro.id },
        movimientoId: retiro.movimientoId,
        motivo: `Anulado desde Cuentas por pagar: ${motivo}`,
        ...(pedido.fecha ? { fecha: pedido.fecha } : {}),
      });
      const eventos = await this.anulador.anular(operador, retiro, {
        motivo,
        enBancos: hecha.forma,
        fechaDelInverso: hecha.fechaDelInverso,
      });
      const anulado = (await this.dependencias.retiros.buscar(retiro.id))!;
      return { dto: await this.lector.leer(operador, anulado), eventos };
    });
    await publicadorEventos.publicar(eventos);
    return dto;
  }
}
