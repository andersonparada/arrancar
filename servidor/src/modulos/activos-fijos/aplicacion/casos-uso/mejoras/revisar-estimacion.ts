import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Activo } from '../../../dominio/activo.js';
import { PorcentajeFiscalAdoptado, RevisionInvalida } from '../../../dominio/errores-de-mejora.js';
import type { ActivoFichaDto } from '../../dto/activo.dto.js';
import type { SolicitudDeRevisionDeEstimacion } from '../../dto/mejora.dto.js';
import type { DependenciasDeCambioDeLibros } from './dependencias-de-mejoras.js';
import { aplicarEstimacion } from './eventos-de-mejoras.js';
import { planearCambioDeLibros } from './planear-cambio-de-libros.js';
import { motivoLimpio } from './motivo-de-revision.js';

interface RevisionPedida {
  activoId: string;
  solicitud: SolicitudDeRevisionDeEstimacion;
}

const VIDA_UTIL_MAXIMA = 1200;

export class RevisarEstimacion {
  constructor(private readonly dependencias: DependenciasDeCambioDeLibros) {}

  /**
   * Revisa la estimación contable de un activo en uso (NIIF para las Pymes 17.19): la vida útil que le queda y, si
   * cambia, su valor residual. Se aplica hacia adelante, con un tramo `revision_de_estimacion` desde el primer mes
   * abierto; lo cerrado no se toca. Queda en la auditoría como `corregir`, con el activo y sus tramos de antes y el motivo.
   * El porcentaje fiscal no se revisa (Ley del ISR, arts. 27 y 28).
   * @throws RecursoNoEncontrado si el activo no existe.
   * @throws ActivoDadoDeBaja o ActivoSinDepreciacionParaMejorar si no es un activo del balance en uso.
   * @throws RevisionInvalida si falta el motivo o la vida o el residual no son válidos.
   * @throws PorcentajeFiscalAdoptado si se pide otro porcentaje fiscal y un cierre ya lo usó.
   */
  ejecutar(operador: Operador, { activoId, solicitud }: RevisionPedida): Promise<ActivoFichaDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const motivo = motivoLimpio(solicitud.motivo);
      const activo = await this.activoBloqueado(activoId);
      await this.exigirSinCambiarElPorcentaje(activo, solicitud);
      const anterior = await consultas.obtener(activoId);
      await this.aplicar(operador, activo, solicitud);
      await this.dependencias.auditoria.registrar({
        recurso: 'activos-fijos.activos',
        registroId: activoId,
        accion: 'corregir',
        anterior,
        motivo,
      });
      return consultas.obtener(activoId);
    });
  }

  private async activoBloqueado(activoId: string): Promise<Activo> {
    await this.dependencias.cierres.bloquear('compartido');
    const [activo] = await this.dependencias.repositorio.buscarBloqueando([activoId]);
    if (!activo) throw new RecursoNoEncontrado('El activo');
    activo.exigirAdmiteMejoras();
    return activo;
  }

  private async exigirSinCambiarElPorcentaje(activo: Activo, solicitud: SolicitudDeRevisionDeEstimacion) {
    const { porcentajeFiscal } = solicitud;
    if (!porcentajeFiscal || Number(porcentajeFiscal) === Number(activo.instantanea().porcentajeFiscal)) return;
    if (await this.dependencias.cierres.usaronTramosDelActivo(activo.id.valor)) throw new PorcentajeFiscalAdoptado();
    throw new RevisionInvalida(
      'El porcentaje fiscal ya quedó adoptado al poner el activo en uso: para cambiarlo, quítelo de uso y póngalo de nuevo.',
    );
  }

  private async aplicar(operador: Operador, activo: Activo, solicitud: SolicitudDeRevisionDeEstimacion) {
    const residual = await this.residualValido(activo, solicitud);
    const plan = await planearCambioDeLibros(this.dependencias, operador, {
      activo,
      causa: 'revision_de_estimacion',
      fecha: null,
      costosNuevos: [],
      vidaRestanteMeses: vidaValida(solicitud.vidaUtilRestanteMeses),
      valorResidualCentavos: residual,
    });
    const { empresaId } = activo.instantanea();
    const cambio = { empresaId: empresaId.valor, activoId: activo.id.valor, mejoraId: null, tramos: plan.tramos };
    await this.dependencias.tramos.reemplazar(cambio);
    aplicarEstimacion(activo, plan.contable!);
    await this.dependencias.repositorio.guardar(activo);
  }

  /** El residual nuevo en centavos (o `null` si no cambia), sin pasar del costo del activo. */
  private async residualValido(activo: Activo, { valorResidual }: SolicitudDeRevisionDeEstimacion) {
    if (valorResidual === null) return null;
    const residual = aCentavos(valorResidual);
    const costo = (await this.dependencias.costos.totalesVigentes([activo.id.valor])).get(activo.id.valor) ?? 0;
    if (residual < 0 || residual > costo)
      throw new RevisionInvalida('El valor residual no puede ser negativo ni pasar del costo del activo.');
    return residual;
  }
}

/** @throws RevisionInvalida si no es un entero de 1 a 1200 meses. */
function vidaValida(vida: number): number {
  if (!Number.isInteger(vida) || vida < 1 || vida > VIDA_UTIL_MAXIMA)
    throw new RevisionInvalida(`La vida útil restante va de 1 a ${VIDA_UTIL_MAXIMA} meses.`);
  return vida;
}
