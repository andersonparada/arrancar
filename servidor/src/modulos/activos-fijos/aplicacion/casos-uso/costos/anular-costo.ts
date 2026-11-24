import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Activo } from '../../../dominio/activo.js';
import type { Costo, CostoId } from '../../../dominio/costo.js';
import { CostoAnteriorADivision, CostoDeActivoNegativo } from '../../../dominio/errores-de-costo.js';
import type { CostoDto } from '../../dto/costo.dto.js';
import type { DependenciasDeCostos } from './dependencias-de-costos.js';
import { eventoDeCostoAnulado } from './eventos-de-costos.js';

interface AnulacionPedida {
  costoId: string;
  motivo: string;
}

export class AnularCosto {
  constructor(private readonly dependencias: DependenciasDeCostos) {}

  /**
   * Anula un costo con su motivo (la fila queda como rastro) y lo deja en la auditoría con cómo estaba. Toma el candado
   * de su línea del libro y bloquea el activo; el total del activo no puede quedar negativo. Al confirmar publica
   * `costo_anulado`.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws CostoNoAnulable si ya está anulado o es el saldo inicial.
   * @throws CostoInvalido si falta el motivo.
   * @throws CostoDeActivoNegativo si el activo quedaría con costo negativo.
   * @throws CostoAnteriorADivision si es anterior a una división vigente del activo (se anula primero la división).
   * @throws CostoPosteriorNoDisponible si el activo ya está en uso con libros.
   */
  async ejecutar(operador: Operador, pedido: AnulacionPedida): Promise<CostoDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { evento, dto } = await unidadDeTrabajo.ejecutar(operador, () => this.anular(operador, pedido));
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async anular(operador: Operador, { costoId, motivo }: AnulacionPedida) {
    const { costos, consultasDeCostos, auditoria } = this.dependencias;
    const { costo, activo } = await this.cargarYRevisar(costoId);
    const anterior = await consultasDeCostos.obtener(costoId);
    costo.anular({ motivo, usuarioId: operador.usuarioId, ahora: new Date() });
    await costos.guardar(costo);
    await auditoria.registrar({
      recurso: 'activos-fijos.costos',
      registroId: costoId,
      accion: 'anular',
      anterior,
      motivo,
    });
    return { evento: await this.evento(operador, { activo, costo }), dto: await consultasDeCostos.obtener(costoId) };
  }

  /** Toma el candado de la línea y bloquea el activo; el total no puede quedar negativo al quitar este costo. */
  private async cargarYRevisar(costoId: string): Promise<{ costo: Costo; activo: Activo }> {
    const { costos, repositorio } = this.dependencias;
    const costo = await costos.buscar(Identificador.desde(costoId) as CostoId);
    if (!costo) throw new RecursoNoEncontrado('El costo');
    costo.exigirAnulable();
    if (await costos.esAnteriorAUnaDivisionVigente(costoId)) throw new CostoAnteriorADivision();
    const { activoId, lineaDeDocumentoId, montoCentavos } = costo.instantanea();
    if (lineaDeDocumentoId) await costos.bloquearLineas([lineaDeDocumentoId]);
    const [activo] = await repositorio.buscarBloqueando([activoId]);
    if (!activo) throw new RecursoNoEncontrado('El activo');
    activo.exigirAdmiteCostos();
    const total = (await costos.totalesVigentes([activoId])).get(activoId) ?? 0;
    if (total - montoCentavos < 0) throw new CostoDeActivoNegativo(activo.instantanea().codigo);
    return { costo, activo };
  }

  private async evento(operador: Operador, { activo, costo }: { activo: Activo; costo: Costo }) {
    const { clases, reloj } = this.dependencias;
    const clase = await clases.buscar(Identificador.desde(activo.instantanea().claseId));
    const incisoFiscal = clase!.instantanea().incisoFiscal;
    return eventoDeCostoAnulado({ activo, incisoFiscal }, costo, await reloj.hoy(operador));
  }
}
