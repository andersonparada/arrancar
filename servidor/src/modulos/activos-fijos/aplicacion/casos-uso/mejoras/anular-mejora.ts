import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Activo } from '../../../dominio/activo.js';
import {
  MejoraConCambiosPosteriores,
  MejoraConLibrosUsados,
  MejoraNoAnulable,
} from '../../../dominio/errores-de-mejora.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { Mejora, MejoraId } from '../../../dominio/mejora.js';
import type { MejoraDto } from '../../dto/mejora.dto.js';
import type { DependenciasDeMejoras } from './dependencias-de-mejoras.js';
import { aplicarEstimacion } from './eventos-de-mejoras.js';
import { eventoDeCostoAnulado } from '../costos/eventos-de-costos.js';

interface AnulacionPedida {
  mejoraId: string;
  motivo: string;
}

export class AnularMejora {
  constructor(private readonly dependencias: DependenciasDeMejoras) {}

  /**
   * Anula la mejora o el costo posterior con su motivo: anula sus costos, deja sin efecto los tramos que creó (y repone
   * el que sustituyeron en su mes) y queda en la auditoría con cómo estaba. Solo si ningún cierre usó sus tramos y no hay
   * otro cambio de depreciación después de ella. Al confirmar publica `costo_anulado` por cada costo.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws MejoraNoAnulable si ya está anulada.
   * @throws MejoraConLibrosUsados si un cierre ya usó su depreciación.
   * @throws MejoraConCambiosPosteriores si otra mejora o revisión parte de ella.
   * @throws MejoraInvalida si falta el motivo.
   */
  async ejecutar(operador: Operador, pedido: AnulacionPedida): Promise<MejoraDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.anular(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async anular(operador: Operador, { mejoraId, motivo }: AnulacionPedida) {
    const { mejoras, consultasDeMejoras, auditoria } = this.dependencias;
    const { mejora, activo } = await this.cargarYRevisar(mejoraId);
    const anterior = await consultasDeMejoras.obtener(mejoraId);
    mejora.anular({ motivo, usuarioId: operador.usuarioId, ahora: new Date() });
    const eventos = await this.anularCostos(operador, {
      mejora,
      activo,
      motivo: mejora.instantanea().motivoDeAnulacion!,
    });
    await this.dependencias.tramos.anularDeMejora(mejoraId);
    await this.reponerEstimacion(activo);
    await mejoras.guardar(mejora);
    await auditoria.registrar({
      recurso: 'activos-fijos.mejoras',
      registroId: mejoraId,
      accion: 'anular',
      anterior,
      motivo,
    });
    return { dto: await consultasDeMejoras.obtener(mejoraId), eventos };
  }

  /** Bloquea el activo y revisa que la mejora se pueda anular: vigente, sin cierres que la usen y la más reciente. */
  private async cargarYRevisar(mejoraId: string): Promise<{ mejora: Mejora; activo: Activo }> {
    const { cierres, mejoras, repositorio, tramos } = this.dependencias;
    await cierres.bloquear('compartido');
    const mejora = await mejoras.buscar(Identificador.desde(mejoraId) as MejoraId);
    if (!mejora) throw new RecursoNoEncontrado('La mejora');
    if (mejora.instantanea().estado === 'anulada') throw new MejoraNoAnulable();
    const [activo] = await repositorio.buscarBloqueando([mejora.instantanea().activoId]);
    if (!activo) throw new RecursoNoEncontrado('El activo');
    if (await cierres.usaronTramosDeLaMejora(mejoraId)) throw new MejoraConLibrosUsados();
    if (await tramos.hayCambiosPosterioresALaMejora(mejoraId)) throw new MejoraConCambiosPosteriores();
    return { mejora, activo };
  }

  private async anularCostos(
    operador: Operador,
    { mejora, activo, motivo }: { mejora: Mejora; activo: Activo; motivo: string },
  ): Promise<EventoDominio[]> {
    const { costos, reloj, clases } = this.dependencias;
    const hoy = await reloj.hoy(operador);
    const clase = await clases.buscar(Identificador.desde(activo.instantanea().claseId));
    const contexto = { activo, incisoFiscal: clase!.instantanea().incisoFiscal };
    const eventos: EventoDominio[] = [];
    for (const costo of await costos.vigentesDeMejora(mejora.id.valor)) {
      costo.anular({ motivo, usuarioId: operador.usuarioId, ahora: new Date() });
      await costos.guardar(costo);
      eventos.push(eventoDeCostoAnulado(contexto, costo, hoy));
    }
    return eventos;
  }

  /** Si la mejora había dado una vida nueva, el activo vuelve a la estimación del tramo contable que rige otra vez. */
  private async reponerEstimacion(activo: Activo): Promise<void> {
    const { tramos, repositorio } = this.dependencias;
    const vigentes = await tramos.vigentesConIdDeActivo(activo.id.valor);
    const contable = vigentes.filter((tramo) => tramo.libro === 'contable').at(-1);
    if (!contable) return;
    aplicarEstimacion(activo, contable);
    await repositorio.guardar(activo);
  }
}
