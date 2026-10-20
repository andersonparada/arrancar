import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { motivoDeQuitarValido } from '../../../dominio/retenciones/constancia-de-retencion.js';
import { RetencionSinConstancia } from '../../../dominio/retenciones/errores-de-retenciones.js';
import { dtoDeRetencion, type ConstanciaAnotadaDto } from '../../dto/retenciones.dto.js';
import {
  avisosDeNumerosRepetidos,
  guardarConstancia,
  prepararConstancia,
  retencionBloqueada,
  type DependenciasDeConstancias,
  type PeticionDeConstancia,
} from './anotador-de-constancias.js';

interface Dependencias extends DependenciasDeConstancias {
  unidadDeTrabajo: UnidadDeTrabajo;
}

/**
 * Anota el número y la fecha de la constancia que la SAT emitió en Retenciones Web (Arrancar no la emite). Sirve
 * también para cambiarla: eso se audita `corregir`. Solo retenciones con monto mayor que cero, y también las de
 * documentos anulados (la constancia pudo emitirse antes de anular).
 */
export class AnotarConstancia {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado, RetencionEnCero, NumeroDeConstanciaInvalido, FechaDeConstanciaInvalida o
   *   ConstanciaAnteriorALaRetencion.
   */
  ejecutar(operador: Operador, peticion: PeticionDeConstancia): Promise<ConstanciaAnotadaDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const retencion = await retencionBloqueada(consultas, peticion.retencionId);
      const preparada = prepararConstancia(retencion, peticion);
      const avisos = await avisosDeNumerosRepetidos(consultas, [preparada]);
      await guardarConstancia(this.dependencias, preparada);
      const guardada = await consultas.buscar(retencion.id, false);
      if (!guardada) throw new RecursoNoEncontrado('La retención');
      return { retencion: dtoDeRetencion(guardada), avisos };
    });
  }
}

/** Quita la constancia anotada (por ejemplo, si se anuló en Retenciones Web): se audita `quitar` con su motivo. */
export class QuitarConstancia {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado, MotivoDeLaConstanciaInvalido o RetencionSinConstancia. */
  ejecutar(operador: Operador, peticion: { retencionId: string; motivo: string }): Promise<ConstanciaAnotadaDto> {
    const motivo = motivoDeQuitarValido(peticion.motivo);
    const { unidadDeTrabajo, consultas, repositorio, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const retencion = await retencionBloqueada(consultas, peticion.retencionId);
      if (!retencion.constancia) throw new RetencionSinConstancia();
      await auditoria.registrar({
        recurso: 'libro-de-compras.retenciones',
        registroId: retencion.id,
        accion: 'quitar',
        anterior: dtoDeRetencion(retencion),
        motivo,
      });
      await repositorio.anotarConstancia(retencion.id, null);
      const guardada = (await consultas.buscar(retencion.id, false)) ?? retencion;
      return { retencion: dtoDeRetencion(guardada), avisos: [] };
    });
  }
}
