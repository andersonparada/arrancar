import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { RECURSO_DE_ARQUEOS, type Arqueo } from '../../../dominio/arqueos.js';
import type { Comprobante } from '../../../dominio/comprobantes.js';
import { ArqueoAnulado } from '../../../dominio/eventos-de-arqueos.js';
import { exigirQueAlcanceElEfectivo, efectoEnLoPendiente } from '../../../dominio/reglas-de-comprobantes.js';
import { exigirArqueoAnulable } from '../../../dominio/reglas-de-arqueos.js';
import { exigirFondoAbierto } from '../../../dominio/reglas-del-fondo.js';
import type { ArqueoDto } from '../../dto/arqueos.dto.js';
import { efectivoEsperadoDelFondo } from '../comprobantes/utilidades-de-comprobantes.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';
import { arqueoDto } from './armado-del-arqueo.js';
import type { DependenciasDeArqueos } from './dependencias-de-arqueos.js';
import { LectorDeArqueos } from './lector-de-arqueos.js';

/** El día contable del arqueo: el de su faltante o sobrante o, sin ellos, el de la fecha del conteo en UTC. */
const diaDelArqueo = (arqueo: Arqueo, comprobante: Comprobante | null): string =>
  comprobante?.fecha ?? arqueo.realizadoEn.slice(0, 10);

export interface PeticionDeAnularArqueo {
  arqueoId: string;
  motivo: string;
}

/**
 * Anula un arqueo (`arqueos.anular`, §5.7): su faltante o sobrante no puede estar en una reposición vigente (si no, se
 * anula primero la reposición); se anula también ese comprobante, y si era un sobrante el efectivo esperado no puede
 * quedar negativo. Audita `anular` con el arqueo como estaba y el motivo. Publica `arqueo_anulado`.
 */
export class AnularArqueo {
  private readonly lectorDelFondo: LectorDelFondo;
  private readonly lector: LectorDeArqueos;

  constructor(private readonly dependencias: DependenciasDeArqueos) {
    this.lectorDelFondo = new LectorDelFondo({
      fondos: dependencias.fondos,
      consultas: dependencias.consultasDeFondos,
    });
    this.lector = new LectorDeArqueos(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado, FondoNoDisponible, ArqueoYaAnulado, ArqueoConComprobanteRepuesto,
   * ComprobantesMayoresQueElEfectivo
   */
  async ejecutar(operador: Operador, pedido: PeticionDeAnularArqueo): Promise<ArqueoDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.anular(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async anular(operador: Operador, { arqueoId, motivo }: PeticionDeAnularArqueo) {
    const { arqueos, comprobantes } = this.dependencias;
    const visible = await this.lector.buscar(arqueoId);
    exigirFondoAbierto(await this.lectorDelFondo.bloquear(visible.fondoId));
    const arqueo = await arqueos.bloquear(arqueoId);
    if (!arqueo) throw new RecursoNoEncontrado('El arqueo');
    const comprobante = await comprobantes.bloquearDelArqueo(arqueoId);
    await this.revisar(arqueo, comprobante);
    const anterior = arqueoDto({ arqueo, comprobante });
    const fechaDeAnulacion = await this.anularLosDos(operador, { arqueo, comprobante, motivo });
    await this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_ARQUEOS,
      registroId: arqueo.id,
      accion: 'anular',
      anterior,
      motivo,
    });
    const evento = this.evento(operador, { arqueo, comprobante, fechaDeAnulacion });
    return { dto: await this.lector.leer((await arqueos.buscar(arqueoId))!), eventos: [evento] };
  }

  /** Vigente, sin su ajuste repuesto y, si el sobrante se va, con efectivo suficiente. */
  private async revisar(arqueo: Arqueo, comprobante: Comprobante | null): Promise<void> {
    exigirArqueoAnulable(arqueo, comprobante?.reposicionNumero ?? null);
    if (comprobante === null || comprobante.estado === 'anulado') return;
    const esperado = await efectivoEsperadoDelFondo(this.dependencias.consultasDeFondos, arqueo.fondoId);
    exigirQueAlcanceElEfectivo(esperado, -efectoEnLoPendiente(comprobante));
  }

  /** Anula el comprobante vigente (si lo hubo) y el arqueo; devuelve la fecha contable de la anulación. */
  private async anularLosDos(
    operador: Operador,
    por: { arqueo: Arqueo; comprobante: Comprobante | null; motivo: string },
  ): Promise<string> {
    const { arqueo, comprobante, motivo } = por;
    const hoy = await this.dependencias.reloj.hoy(operador);
    const dia = diaDelArqueo(arqueo, comprobante);
    const fechaDeAnulacion = hoy < dia ? dia : hoy;
    const anulacion = { anuladoPor: operador.usuarioId, motivo, fechaDeAnulacion };
    if (comprobante && comprobante.estado === 'vigente') {
      await this.dependencias.comprobantes.anular(comprobante.id, anulacion);
    }
    await this.dependencias.arqueos.anular(arqueo.id, anulacion);
    return fechaDeAnulacion;
  }

  private evento(
    operador: Operador,
    por: { arqueo: Arqueo; comprobante: Comprobante | null; fechaDeAnulacion: string },
  ): EventoDominio {
    const { arqueo, comprobante, fechaDeAnulacion } = por;
    return new ArqueoAnulado({
      empresaId: operador.empresaId,
      fondoId: arqueo.fondoId,
      arqueoId: arqueo.id,
      numero: arqueo.numero,
      fecha: diaDelArqueo(arqueo, comprobante),
      fechaDeAnulacion,
      diferenciaCentavos: arqueo.diferenciaCentavos,
      destinoDelFaltante: comprobante?.destinoDelFaltante ?? null,
      comprobanteId: comprobante?.id ?? null,
    });
  }
}
