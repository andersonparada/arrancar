import type { CausaDeAnulacionDeDocumento } from '../../core/contratos/libro-de-compras.contratos.js';
import type { DocumentoPorPagar } from './documento-por-pagar.js';
import {
  DocumentoConNotas,
  DocumentoConNotasVigentes,
  DocumentoNoAutorizado,
  DocumentoNoEliminable,
  DocumentoNoPendiente,
  DocumentoNoRegistrado,
  DocumentoYaAnulado,
  DocumentoYaAutorizado,
  MotivoInvalido,
  VencimientoInvalido,
  VencimientoNoEditable,
} from './errores.js';
import { claseDe } from './tipos-de-documento.js';

/** Cuántos documentos se completan o se autorizan en una sola petición (U11). */
export const MAXIMO_POR_LOTE = 100;

/** @throws DocumentoNoPendiente si ya no está en la bandeja. */
export function exigirPendiente(documento: DocumentoPorPagar, etiqueta: string): void {
  if (documento.estado !== 'pendiente') throw new DocumentoNoPendiente(etiqueta);
}

/**
 * @throws DocumentoYaAutorizado si ya se autorizó, DocumentoYaAnulado si se anuló y DocumentoNoRegistrado si aún no
 * se completa.
 */
export function exigirRegistrado(documento: DocumentoPorPagar, etiqueta: string): void {
  if (documento.estado === 'autorizado') throw new DocumentoYaAutorizado(etiqueta);
  if (documento.estado === 'anulado') throw new DocumentoYaAnulado(etiqueta);
  if (documento.estado !== 'registrado') throw new DocumentoNoRegistrado(etiqueta);
}

/** @throws DocumentoNoAutorizado si no está autorizado. */
export function exigirAutorizado(documento: DocumentoPorPagar, etiqueta: string): void {
  if (documento.estado !== 'autorizado') throw new DocumentoNoAutorizado(etiqueta);
}

/** Separación de funciones: quien lo ingresó en Libro de compras o lo completó no debería autorizarlo. */
export function esDeLoPropio(documento: DocumentoPorPagar, usuarioId: string): boolean {
  return documento.registradoPor === usuarioId || documento.ingresadoPor === usuarioId;
}

function exigirVencimientoDeCargo(documento: DocumentoPorPagar, vencimiento: string): void {
  if (vencimiento < documento.fechaEmision) {
    throw new VencimientoInvalido('El vencimiento no puede ser anterior a la fecha de emisión del documento.');
  }
}

/**
 * El vencimiento con que queda un documento al completarlo: el que se escribió o, si no se escribió, el propuesto al
 * recibirlo. Una nota de crédito no vence: no admite vencimiento.
 * @throws VencimientoInvalido si una nota de crédito trae vencimiento o un cargo vence antes de emitirse.
 */
export function vencimientoAlCompletar(documento: DocumentoPorPagar, vencimiento: string | undefined): string | null {
  if (claseDe(documento.tipo) === 'abono') {
    if (vencimiento) throw new VencimientoInvalido('Una nota de crédito no vence: no lleva vencimiento.');
    return null;
  }
  const definitivo = vencimiento ?? documento.vencimiento;
  if (definitivo === null) throw new VencimientoInvalido('Escriba el vencimiento del documento.');
  exigirVencimientoDeCargo(documento, definitivo);
  return definitivo;
}

/**
 * Cambiar el vencimiento vale para un cargo completado o autorizado (los pagos, en CP4, lo cerrarán).
 * @throws VencimientoNoEditable, VencimientoInvalido
 */
export function exigirVencimientoNuevoValido(
  documento: DocumentoPorPagar,
  vencimiento: string,
  etiqueta: string,
): void {
  const editable = claseDe(documento.tipo) === 'cargo' && ['registrado', 'autorizado'].includes(documento.estado);
  if (!editable) throw new VencimientoNoEditable(etiqueta);
  exigirVencimientoDeCargo(documento, vencimiento);
}

const MAXIMO_DEL_MOTIVO = 300;

/** El motivo sin espacios sobrantes: de 1 a 300 caracteres. @throws MotivoInvalido */
export function motivoValido(motivo: string): string {
  const limpio = motivo.trim();
  if (limpio.length === 0 || limpio.length > MAXIMO_DEL_MOTIVO) throw new MotivoInvalido();
  return limpio;
}

/** @throws DocumentoYaAnulado, DocumentoConNotasVigentes */
export function exigirAnulable(documento: DocumentoPorPagar, notasVigentes: number, etiqueta: string): void {
  if (documento.estado === 'anulado') throw new DocumentoYaAnulado(etiqueta);
  if (notasVigentes > 0) throw new DocumentoConNotasVigentes(etiqueta);
}

/**
 * Solo se elimina lo pendiente o completado y sin notas (ni anuladas). Lo autorizado lo rechaza la regla de baja
 * `noEstarAutorizado`, que también corre con la fila bloqueada.
 * @throws DocumentoNoEliminable, DocumentoConNotas
 */
export function exigirEliminable(documento: DocumentoPorPagar, notasEnTotal: number, etiqueta: string): void {
  if (documento.estado === 'anulado') throw new DocumentoNoEliminable(etiqueta);
  if (notasEnTotal > 0) throw new DocumentoConNotas(etiqueta);
}

/** Las causas con que Libro de compras acepta anular un registro (no la FEL: solo su emisor la anula en la SAT). */
export const CAUSAS_DE_ANULACION = [
  'error_de_captura',
  'fel_anulada_por_el_emisor',
  'no_corresponde_a_la_empresa',
] as const satisfies readonly CausaDeAnulacionDeDocumento[];
