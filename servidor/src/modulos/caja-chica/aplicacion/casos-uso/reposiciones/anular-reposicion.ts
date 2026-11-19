import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { MODULO_DE_ORIGEN } from '../../../dominio/fondos.js';
import type { Reposicion } from '../../../dominio/reposiciones.js';
import type { ReposicionDto } from '../../dto/reposiciones.dto.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';
import { AnuladorDeReposiciones, type DatosDeAnularLaReposicion } from './anulador-de-reposiciones.js';
import type { DependenciasDeReposiciones } from './dependencias-de-reposiciones.js';
import { LectorDeReposiciones } from './lector-de-reposiciones.js';

/** El motivo (queda en la auditoría) y, si Bancos hace un inverso, su fecha. */
export interface PeticionDeAnularReposicion {
  reposicionId: string;
  motivo: string;
  fecha?: string;
}

/**
 * Anula una reposición (`reposiciones.anular`, §5.6): ordena a Bancos anular el cheque o la nota (si el banco ya lo pagó
 * se rechaza con `ReposicionCobrada`), deja la reposición `anulada` (los comprobantes vuelven a pendientes y los
 * documentos del libro a «sin procesar») y audita `anular` con la reposición como estaba y el motivo. Publica
 * `reposicion_anulada`.
 */
export class AnularReposicion {
  private readonly lectorDelFondo: LectorDelFondo;
  private readonly lector: LectorDeReposiciones;
  private readonly anulador: AnuladorDeReposiciones;

  constructor(private readonly dependencias: DependenciasDeReposiciones) {
    this.lectorDelFondo = new LectorDelFondo({
      fondos: dependencias.fondos,
      consultas: dependencias.consultasDeFondos,
    });
    this.lector = new LectorDeReposiciones(dependencias);
    this.anulador = new AnuladorDeReposiciones(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado, FondoNoDisponible, ReposicionYaAnulada, ReposicionDelCierre, ReposicionCobrada,
   * ComprobantesMayoresQueElEfectivo y lo que rechace Bancos.
   */
  async ejecutar(operador: Operador, pedido: PeticionDeAnularReposicion): Promise<ReposicionDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.anular(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async anular(operador: Operador, pedido: PeticionDeAnularReposicion) {
    const { reposiciones } = this.dependencias;
    const visible = await this.lector.buscar(pedido.reposicionId);
    const fondo = await this.lectorDelFondo.bloquear(visible.fondoId);
    const reposicion = await reposiciones.bloquear(visible.id);
    if (!reposicion) throw new RecursoNoEncontrado('La reposición');
    await this.anulador.revisar({ fondo, reposicion });
    const datos = await this.anularEnBancos(operador, { reposicion, pedido });
    const eventos = await this.anulador.anular(operador, { reposicion, datos });
    return { dto: await this.lector.leer(await this.lector.buscar(reposicion.id)), eventos };
  }

  /** Bancos anula el cheque o la nota (con inverso o sin él). */
  private async anularEnBancos(
    operador: Operador,
    por: { reposicion: Reposicion; pedido: PeticionDeAnularReposicion },
  ): Promise<DatosDeAnularLaReposicion> {
    const { reposicion, pedido } = por;
    const motivo = pedido.motivo.trim();
    const anulado = await this.dependencias.bancos.anularMovimiento(operador, {
      origen: { modulo: MODULO_DE_ORIGEN, documentoId: reposicion.id },
      movimientoId: reposicion.movimientoId!,
      motivo,
      ...(pedido.fecha ? { fecha: pedido.fecha } : {}),
    });
    return { motivo, enBancos: anulado.forma, fechaDelInverso: anulado.fechaDelInverso };
  }
}
