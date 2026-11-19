import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { Activo } from '../../../dominio/activo.js';
import { TrasladoNoAnulable, TrasladoNoEsElUltimo } from '../../../dominio/errores-de-traslado.js';
import type { Traslado } from '../../../dominio/traslado.js';
import type { BoletaDto } from '../../dto/traslado.dto.js';
import { exigirMesAbierto, IncisosDeClases, type DependenciasDeTraslados } from './dependencias-de-traslados.js';
import { eventoDeTrasladoAnulado } from './eventos-de-traslados.js';

interface AnulacionPedida {
  grupoId: string;
  motivo: string;
}

export class AnularTraslado {
  constructor(private readonly dependencias: DependenciasDeTraslados) {}

  /**
   * Anula la boleta con su motivo: cada activo vuelve a la ubicación que tenía antes y las filas quedan como rastro.
   * Solo si la fecha está en un mes abierto y la boleta es la última de cada uno de sus activos. No quita la marca de
   * ocioso que haya puesto el traslado (se quita desde la ficha). Queda en la auditoría con la boleta como estaba y, al
   * confirmar, publica `traslado_anulado` por activo.
   * @throws RecursoNoEncontrado si la boleta no existe o no es de la empresa.
   * @throws TrasladoNoAnulable si ya está anulada.
   * @throws TrasladoInvalido si falta el motivo.
   * @throws MesCerrado si el mes del traslado ya está cerrado.
   * @throws TrasladoNoEsElUltimo si un activo tiene un traslado posterior.
   */
  async ejecutar(operador: Operador, pedido: AnulacionPedida): Promise<BoletaDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { boleta, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.anular(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return boleta;
  }

  private async anular(operador: Operador, { grupoId, motivo }: AnulacionPedida) {
    const { cierres, consultasDeTraslados, auditoria } = this.dependencias;
    await cierres.bloquear('compartido');
    const renglones = await this.cargar(grupoId);
    const anterior = await consultasDeTraslados.boleta(grupoId);
    const eventos = await this.deshacer(renglones, { operador, motivo });
    await auditoria.registrar({
      recurso: 'activos-fijos.traslados',
      registroId: grupoId,
      accion: 'anular',
      anterior,
      motivo,
    });
    return { boleta: await consultasDeTraslados.boleta(grupoId), eventos };
  }

  /** Los renglones de la boleta, sin anular y en un mes abierto. */
  private async cargar(grupoId: string): Promise<Traslado[]> {
    const renglones = await this.dependencias.traslados.delGrupo(grupoId);
    const primero = renglones[0];
    if (!primero) throw new RecursoNoEncontrado('La boleta de traslado');
    if (primero.instantanea().estado === 'anulado') throw new TrasladoNoAnulable();
    await exigirMesAbierto(this.dependencias.cierres, primero.instantanea().fecha);
    return renglones;
  }

  private async deshacer(renglones: readonly Traslado[], contexto: { operador: Operador; motivo: string }) {
    const { repositorio, clases } = this.dependencias;
    const incisos = new IncisosDeClases(clases);
    const activos = await repositorio.buscarBloqueando(renglones.map((renglon) => renglon.instantanea().activoId));
    const eventos: EventoDominio[] = [];
    for (const traslado of renglones) {
      const activo = activos.find((candidato) => candidato.id.valor === traslado.instantanea().activoId);
      if (!activo) throw new RecursoNoEncontrado('El activo');
      await this.deshacerUno({ traslado, activo }, contexto);
      eventos.push(
        eventoDeTrasladoAnulado({ activo, traslado, incisoFiscal: await incisos.de(activo.instantanea().claseId) }),
      );
    }
    return eventos;
  }

  /** Anula el renglón y devuelve el activo a la fila vigente anterior del historial (el alta siempre existe). */
  private async deshacerUno(
    { traslado, activo }: { traslado: Traslado; activo: Activo },
    { operador, motivo }: { operador: Operador; motivo: string },
  ): Promise<void> {
    const { traslados, repositorio } = this.dependencias;
    const [ultimo, previo] = await traslados.recientesDeActivo(activo.id.valor, 2);
    if (ultimo?.trasladoId !== traslado.id.valor || !previo)
      throw new TrasladoNoEsElUltimo(activo.instantanea().codigo);
    traslado.anular({ motivo, usuarioId: operador.usuarioId, ahora: new Date() });
    await traslados.guardar(traslado);
    const { localidadId, departamentoId, responsable, aBodega } = previo;
    activo.moverA({ localidadId, departamentoId, responsable, enBodega: aBodega });
    await repositorio.guardar(activo);
  }
}
