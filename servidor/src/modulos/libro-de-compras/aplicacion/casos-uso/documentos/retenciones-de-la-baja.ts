import {
  DocumentoConConstancia,
  DocumentoConRetencionEnterada,
} from '../../../dominio/retenciones/errores-de-retenciones.js';
import { GRUPO_DE_ENTERO, mesDeLaRetencion } from '../../../dominio/retenciones/grupo-de-entero.js';
import { tieneEnteroVigente, type EnteroGuardado } from '../../../dominio/retenciones/retencion-del-reporte.js';
import type {
  ConsultasDeEnteros,
  RetencionesDeUnDocumento,
  RetencionPracticada,
} from '../../puertos/puertos-de-retenciones.js';

/** Lo que Anular y Eliminar documento necesitan para tratar sus retenciones. */
export interface DependenciasDeRetencionesDeLaBaja {
  retenciones: RetencionesDeUnDocumento;
  enteros: Pick<ConsultasDeEnteros, 'delRango'>;
}

/** Los pagos de los meses de las retenciones (ninguno si no hay retenciones). */
async function pagosDe(
  enteros: Pick<ConsultasDeEnteros, 'delRango'>,
  practicadas: readonly RetencionPracticada[],
): Promise<EnteroGuardado[]> {
  if (practicadas.length === 0) return [];
  const meses = practicadas.map(({ fecha }) => mesDeLaRetencion(fecha)).sort();
  return enteros.delRango(meses[0]!, meses[meses.length - 1]!);
}

const estaEnterada = (pagos: readonly EnteroGuardado[], { regla, fecha }: RetencionPracticada): boolean =>
  tieneEnteroVigente(pagos, mesDeLaRetencion(fecha), GRUPO_DE_ENTERO[regla]);

/**
 * Eliminar borra el rastro, así que no se permite si una retención con monto tiene constancia o si su mes y grupo ya
 * tiene un entero: ese documento solo se anula.
 * @throws DocumentoConConstancia o DocumentoConRetencionEnterada.
 */
export async function exigirSinConstanciaNiEntero(
  dependencias: DependenciasDeRetencionesDeLaBaja,
  documentoId: string,
): Promise<void> {
  const practicadas = await dependencias.retenciones.practicadas(documentoId);
  if (practicadas.some((retencion) => retencion.conConstancia)) throw new DocumentoConConstancia();
  const pagos = await pagosDe(dependencias.enteros, practicadas);
  if (practicadas.some((retencion) => estaEnterada(pagos, retencion))) throw new DocumentoConRetencionEnterada();
}

const plural = (cantidad: number): string =>
  cantidad === 1 ? 'Queda 1 retención por resolver' : `Quedan ${cantidad} retenciones por resolver`;

/**
 * Al anular, las retenciones con monto quedan «por resolver» (anular la constancia en Retenciones Web, rectificar el
 * entero o confirmar que no hacía falta). Devuelve los avisos: cuántas quedaron y, si su mes y grupo ya se enteró,
 * que hay que rectificar.
 */
export async function dejarRetencionesPorResolver(
  dependencias: DependenciasDeRetencionesDeLaBaja,
  documentoId: string,
): Promise<string[]> {
  const practicadas = await dependencias.retenciones.practicadas(documentoId);
  if (practicadas.length === 0) return [];
  await dependencias.retenciones.dejarPorResolver(documentoId);
  const pagos = await pagosDe(dependencias.enteros, practicadas);
  const avisos = [
    `${plural(practicadas.length)}: anule la constancia, rectifique el entero o confirme que no hacía falta.`,
  ];
  if (practicadas.some((retencion) => estaEnterada(pagos, retencion))) {
    avisos.push('Ese mes ya se enteró: rectifique el entero.');
  }
  return avisos;
}
