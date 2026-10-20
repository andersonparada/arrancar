import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { constanciaValida, type ConstanciaAnotada } from '../../../dominio/retenciones/constancia-de-retencion.js';
import { RetencionEnCero } from '../../../dominio/retenciones/errores-de-retenciones.js';
import type { RetencionDelReporte } from '../../../dominio/retenciones/retencion-del-reporte.js';
import { dtoDeRetencion } from '../../dto/retenciones.dto.js';
import type { ConsultasDeRetenciones, RepositorioDeRetenciones } from '../../puertos/puertos-de-retenciones.js';

export interface DependenciasDeConstancias {
  consultas: ConsultasDeRetenciones;
  repositorio: RepositorioDeRetenciones;
  auditoria: Auditoria;
}

/** Una constancia que el usuario quiere anotar en una retención. */
export interface PeticionDeConstancia {
  retencionId: string;
  numero: string;
  fecha: string;
}

/** La constancia ya revisada junto con su retención. */
export interface ConstanciaPreparada {
  retencion: RetencionDelReporte;
  constancia: ConstanciaAnotada;
}

/** @throws RetencionEnCero, NumeroDeConstanciaInvalido, FechaDeConstanciaInvalida o ConstanciaAnteriorALaRetencion. */
export function prepararConstancia(
  retencion: RetencionDelReporte,
  peticion: PeticionDeConstancia,
): ConstanciaPreparada {
  if (retencion.monto <= 0) throw new RetencionEnCero();
  return { retencion, constancia: constanciaValida(peticion, retencion.fecha) };
}

/** Busca y bloquea la retención; @throws RecursoNoEncontrado. */
export async function retencionBloqueada(
  consultas: ConsultasDeRetenciones,
  retencionId: string,
): Promise<RetencionDelReporte> {
  const retencion = await consultas.buscar(retencionId, true);
  if (!retencion) throw new RecursoNoEncontrado('La retención');
  return retencion;
}

/**
 * Guarda la constancia. Anotarla por primera vez no se audita (es un alta); cambiarla se audita `corregir`, con la
 * retención como estaba.
 */
export async function guardarConstancia(
  dependencias: DependenciasDeConstancias,
  { retencion, constancia }: ConstanciaPreparada,
): Promise<void> {
  if (retencion.constancia) {
    await dependencias.auditoria.registrar({
      recurso: 'libro-de-compras.retenciones',
      registroId: retencion.id,
      accion: 'corregir',
      anterior: dtoDeRetencion(retencion),
    });
  }
  await dependencias.repositorio.anotarConstancia(retencion.id, constancia);
}

/** Avisa, sin bloquear, de los números de constancia que ya usa otro proveedor (puede ser un error de captura). */
export async function avisosDeNumerosRepetidos(
  consultas: ConsultasDeRetenciones,
  preparadas: readonly ConstanciaPreparada[],
): Promise<string[]> {
  const numeros = [...new Set(preparadas.map(({ constancia }) => constancia.numero))];
  const usados = await consultas.proveedoresConConstancia(numeros);
  const repetidos = numeros.filter((numero) =>
    preparadas.some(
      ({ retencion, constancia }) =>
        constancia.numero === numero &&
        usados.some((uso) => uso.numero === numero && uso.proveedorId !== retencion.proveedor.id),
    ),
  );
  return repetidos.map(
    (numero) => `La constancia ${numero} ya está anotada en retenciones de otro proveedor: revise que no la repitió.`,
  );
}
