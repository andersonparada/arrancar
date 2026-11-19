import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { MODULO_DE_ORIGEN } from '../../../dominio/anticipos.js';
import { motivoValido } from '../../../dominio/reglas-del-anticipo.js';
import type { AnticipoDto } from '../../dto/anticipos.dto.js';
import { AnuladorDelAnticipo } from './anulador-del-anticipo.js';
import { anticipoBloqueado } from './bloqueo-del-anticipo.js';
import type { DependenciasDeAnticipos } from './dependencias-de-anticipos.js';
import { LectorDelAnticipo } from './lector-del-anticipo.js';

export interface PeticionParaAnularAnticipo {
  anticipoId: string;
  motivo: string;
  /** `AAAA-MM-DD`: la fecha del inverso en Bancos; por omisión decide Bancos. */
  fecha?: string;
}

/**
 * Anula un anticipo desde Cuentas por liquidar (`anticipos.anular`): bloquea el movimiento de Bancos y el anticipo, revisa
 * que esté abierto, sin gastos vigentes y con el cheque sin cobrar, ordena a Bancos anular el cheque o la nota (a la antigua
 * o con inverso; si Bancos lanza, nada cambia), lo deja `anulado` con su fecha contable, audita `anular` con el anticipo como
 * estaba y publica `anticipo_anulado` al confirmar.
 */
export class AnularAnticipo {
  private readonly anulador: AnuladorDelAnticipo;
  private readonly lector: LectorDelAnticipo;

  constructor(private readonly dependencias: DependenciasDeAnticipos) {
    this.anulador = new AnuladorDelAnticipo(dependencias);
    this.lector = new LectorDelAnticipo(dependencias);
  }

  /** @throws MotivoInvalido, RecursoNoEncontrado, AnticipoYaAnulado, AnticipoLiquidado, AnticipoConGastos, AnticipoCobrado y lo que rechace Bancos. */
  async ejecutar(operador: Operador, pedido: PeticionParaAnularAnticipo): Promise<AnticipoDto> {
    const motivo = motivoValido(pedido.motivo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const anticipo = await anticipoBloqueado(this.dependencias, pedido.anticipoId);
      await this.anulador.revisar(anticipo);
      const hecha = await this.dependencias.bancos.anularMovimiento(operador, {
        origen: { modulo: MODULO_DE_ORIGEN, documentoId: anticipo.id },
        movimientoId: anticipo.movimientoId,
        motivo,
        ...(pedido.fecha ? { fecha: pedido.fecha } : {}),
      });
      const eventos = await this.anulador.anular(operador, anticipo, {
        motivo,
        enBancos: hecha.forma,
        fechaDelInverso: hecha.fechaDelInverso,
      });
      const anulado = (await this.dependencias.anticipos.buscar(anticipo.id))!;
      return { dto: await this.lector.leer(operador, anulado), eventos };
    });
    await publicadorEventos.publicar(eventos);
    return dto;
  }
}
