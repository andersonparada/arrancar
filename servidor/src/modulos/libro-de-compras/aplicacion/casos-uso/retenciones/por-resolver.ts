import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { GRUPO_DE_ENTERO, mesDeLaRetencion } from '../../../dominio/retenciones/grupo-de-entero.js';
import {
  accionSugerida,
  exigirResolvible,
  notaDeResolucionValida,
  resolucionValida,
  type ResolucionDeRetencion,
} from '../../../dominio/retenciones/resolucion-de-retencion.js';
import {
  tieneEnteroVigente,
  type EnteroGuardado,
  type RetencionDelReporte,
} from '../../../dominio/retenciones/retencion-del-reporte.js';
import { dtoDeRetencion, type RetencionPorResolverDto } from '../../dto/retenciones.dto.js';
import type {
  ConsultasDeEnteros,
  ConsultasDeRetenciones,
  RepositorioDeRetenciones,
} from '../../puertos/puertos-de-retenciones.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeRetenciones;
  repositorio: RepositorioDeRetenciones;
  enteros: ConsultasDeEnteros;
  auditoria: Auditoria;
}

/** La retención con su resolución y lo que hace falta para decidir: si hay constancia y si su mes y grupo se enteró. */
function dtoPorResolver(retencion: RetencionDelReporte, pagos: readonly EnteroGuardado[]): RetencionPorResolverDto {
  const mes = mesDeLaRetencion(retencion.fecha);
  const enterada = tieneEnteroVigente(pagos, mes, GRUPO_DE_ENTERO[retencion.regla]);
  return {
    ...dtoDeRetencion(retencion),
    resolucion: retencion.resolucion ?? 'pendiente',
    nota: retencion.notaDeResolucion,
    resueltaEn: retencion.resueltaEn,
    resueltaPor: retencion.resueltaPor,
    motivoDeAnulacionDelDocumento: retencion.documento.motivoDeAnulacion,
    enterada,
    accionSugerida: accionSugerida({ conConstancia: retencion.constancia !== null, enterada }),
  };
}

async function pagosDeLasRetenciones(enteros: ConsultasDeEnteros, retenciones: readonly RetencionDelReporte[]) {
  if (retenciones.length === 0) return [];
  const meses = retenciones.map((retencion) => mesDeLaRetencion(retencion.fecha)).sort();
  return enteros.delRango(meses[0]!, meses[meses.length - 1]!);
}

/** Las retenciones de documentos anulados que quedaron por resolver, o las que ya se resolvieron. */
export class ConsultarPorResolver {
  constructor(private readonly dependencias: Pick<Dependencias, 'unidadDeTrabajo' | 'consultas' | 'enteros'>) {}

  ejecutar(operador: Operador, estado: 'pendiente' | 'resueltas'): Promise<RetencionPorResolverDto[]> {
    const { unidadDeTrabajo, consultas, enteros } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const retenciones = await consultas.porResolver(estado);
      const pagos = await pagosDeLasRetenciones(enteros, retenciones);
      return retenciones.map((retencion) => dtoPorResolver(retencion, pagos));
    });
  }
}

export interface PeticionDeResolucion {
  retencionId: string;
  resolucion: string;
  nota?: string | null;
}

/**
 * Resuelve (o vuelve a dejar pendiente) la retención practicada de un documento anulado: constancia anulada,
 * entero rectificado o no requería nada. Resolver exige una nota. Se audita `corregir` con la retención como estaba.
 */
export class ResolverRetencion {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado, ResolucionInvalida, NotaDeResolucionInvalida, RetencionEnCero o
   *   ResolucionSoloDeDocumentoAnulado.
   */
  ejecutar(operador: Operador, peticion: PeticionDeResolucion): Promise<RetencionPorResolverDto> {
    const resolucion = resolucionValida(peticion.resolucion);
    const nota = notaDeResolucionValida(resolucion, peticion.nota);
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, () =>
      this.resolver(operador, peticion.retencionId, { resolucion, nota }),
    );
  }

  private async resolver(
    operador: Operador,
    retencionId: string,
    cambio: { resolucion: ResolucionDeRetencion; nota: string | null },
  ): Promise<RetencionPorResolverDto> {
    const { consultas, repositorio, auditoria, enteros } = this.dependencias;
    const retencion = await consultas.buscar(retencionId, true);
    if (!retencion) throw new RecursoNoEncontrado('La retención');
    exigirResolvible({ documentoAnulado: retencion.documento.estado === 'anulado', monto: retencion.monto });
    await auditoria.registrar({
      recurso: 'libro-de-compras.retenciones',
      registroId: retencion.id,
      accion: 'corregir',
      anterior: dtoDeRetencion(retencion),
      motivo: cambio.nota,
    });
    await repositorio.resolver(retencion.id, { ...cambio, resueltaPor: operador.usuarioId });
    const guardada = (await consultas.buscar(retencion.id, false)) ?? retencion;
    return dtoPorResolver(guardada, await pagosDeLasRetenciones(enteros, [guardada]));
  }
}
