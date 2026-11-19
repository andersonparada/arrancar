import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { MODULO_DE_ORIGEN, type Anticipo } from '../../../dominio/anticipos.js';
import { motivoValido } from '../../../dominio/reglas-del-anticipo.js';
import type { AnticipoDto } from '../../dto/anticipos.dto.js';
import { anticipoBloqueado } from './bloqueo-del-anticipo.js';
import type { DependenciasDeAnticipos } from './dependencias-de-anticipos.js';
import { LectorDelAnticipo } from './lector-del-anticipo.js';
import { ReabridorDelAnticipo, type DatosDeReabrirElAnticipo } from './reabridor-del-anticipo.js';

export interface PeticionParaReabrirAnticipo {
  anticipoId: string;
  motivo: string;
  /** `AAAA-MM-DD`: la fecha del inverso del depósito o del reembolso en Bancos; por omisión decide Bancos. */
  fecha?: string;
}

type AnulacionEnBancos = Pick<DatosDeReabrirElAnticipo, 'enBancos' | 'fechaDelInverso'>;

/**
 * Reabre un anticipo liquidado (`anticipos.liquidar`): con su motivo, ordena a Bancos anular el depósito de la devolución o
 * el reembolso (si lo hubo; si Bancos lo rechaza, p. ej. por un mes conciliado, no se reabre), deja el anticipo abierto sin
 * liquidación, vuelve a fijar el reparto de la entrega, audita `reabrir` y publica `anticipo_reabierto` al confirmar.
 */
export class ReabrirAnticipo {
  private readonly reabridor: ReabridorDelAnticipo;
  private readonly lector: LectorDelAnticipo;

  constructor(private readonly dependencias: DependenciasDeAnticipos) {
    this.reabridor = new ReabridorDelAnticipo(dependencias);
    this.lector = new LectorDelAnticipo(dependencias);
  }

  /** @throws MotivoInvalido, RecursoNoEncontrado, AnticipoYaAnulado, AnticipoNoLiquidado y lo que rechace Bancos. */
  async ejecutar(operador: Operador, pedido: PeticionParaReabrirAnticipo): Promise<AnticipoDto> {
    const motivo = motivoValido(pedido.motivo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const anticipo = await anticipoBloqueado(this.dependencias, pedido.anticipoId);
      this.reabridor.revisar(anticipo);
      const anulacion = await this.anularElMovimiento(operador, anticipo, { motivo, fecha: pedido.fecha });
      const eventos = await this.reabridor.reabrir(operador, anticipo, { motivo, ...anulacion });
      return {
        dto: await this.lector.leer(operador, (await this.dependencias.anticipos.buscar(anticipo.id))!),
        eventos,
      };
    });
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  /** La orden a Bancos si el anticipo tiene depósito o reembolso; si no, no hay nada que anular allá. */
  private async anularElMovimiento(
    operador: Operador,
    anticipo: Anticipo,
    { motivo, fecha }: { motivo: string; fecha?: string },
  ): Promise<AnulacionEnBancos> {
    const movimientoId = anticipo.movimientoDeDevolucionId ?? anticipo.movimientoDeReembolsoId;
    if (!movimientoId) return { enBancos: null, fechaDelInverso: null };
    const hecha = await this.dependencias.bancos.anularMovimiento(operador, {
      origen: { modulo: MODULO_DE_ORIGEN, documentoId: anticipo.id },
      movimientoId,
      motivo: `Anticipo reabierto desde Cuentas por liquidar: ${motivo}`,
      ...(fecha ? { fecha } : {}),
    });
    return { enBancos: hecha.forma, fechaDelInverso: hecha.fechaDelInverso };
  }
}
