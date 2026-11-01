import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type { DocumentoACompletar, DocumentoPorPagar } from '../servicios/tipos';

export type VencimientosPorDocumento = Record<string, string>;

const esCargo = ({ clase }: DocumentoPorPagar): boolean => clase === 'cargo';

/** El vencimiento propuesto al recibir cada cargo; una nota de crédito no vence. */
export function vencimientosIniciales(documentos: readonly DocumentoPorPagar[]): VencimientosPorDocumento {
  return Object.fromEntries(documentos.filter(esCargo).map(({ id, vencimiento }) => [id, vencimiento ?? '']));
}

function errorDelVencimiento(documento: DocumentoPorPagar, vencimiento: string | undefined): string | null {
  if (!esCargo(documento)) return null;
  if (!vencimiento) return 'Escriba la fecha de vencimiento.';
  if (vencimiento < documento.fechaEmision) {
    return `No puede ser anterior a la emisión (${formatearFecha(documento.fechaEmision)}).`;
  }
  return null;
}

/** Los errores por documento escogido antes de molestar al servidor; vacío si todo está bien. */
export function erroresDeCompletar(
  escogidos: readonly DocumentoPorPagar[],
  vencimientos: VencimientosPorDocumento,
): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const documento of escogidos) {
    const error = errorDelVencimiento(documento, vencimientos[documento.id]);
    if (error) errores[documento.id] = error;
  }
  return errores;
}

/** El cuerpo de la petición: cada cargo con el vencimiento confirmado; una nota de crédito, sin vencimiento. */
export function documentosACompletar(
  escogidos: readonly DocumentoPorPagar[],
  vencimientos: VencimientosPorDocumento,
): DocumentoACompletar[] {
  return escogidos.map((documento) => {
    const vencimiento = vencimientos[documento.id];
    return esCargo(documento) && vencimiento ? { id: documento.id, vencimiento } : { id: documento.id };
  });
}

/** Lo que va a pasar al completar, para que se lea antes de confirmar. */
export function resumenDeCompletar(escogidos: readonly DocumentoPorPagar[]): string {
  const cantidad = escogidos.length;
  const cuales = cantidad === 1 ? 'el documento escogido' : `los ${cantidad} documentos escogidos`;
  const quedan = cantidad === 1 ? 'Queda' : 'Quedan';
  return `Se completarán ${cuales} con los vencimientos que ve en pantalla. ${quedan} por autorizar en Documentos por pagar.`;
}
