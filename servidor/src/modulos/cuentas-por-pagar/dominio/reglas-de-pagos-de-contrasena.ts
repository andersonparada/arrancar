import { ContrasenaConPagos, DocumentoConPagosEnLaContrasena } from './errores-de-pagos.js';
import type { LineaDePago } from './pagos.js';

/**
 * Las líneas de pago de una contraseña se buscan por `aplicaciones_de_pagos.contrasena_id` (la contraseña de cada línea),
 * nunca por la del pago: así sirven igual si un pago llega a cubrir varias contraseñas del mismo proveedor.
 */

/**
 * Una contraseña con pagos vigentes no se anula.
 * @param numero el número de la contraseña como se lee (`15` o `2026-15`).
 * @throws ContrasenaConPagos
 */
export function exigirContrasenaSinPagosVigentes(numero: string, lineas: readonly LineaDePago[]): void {
  if (lineas.some(({ estado }) => estado === 'vigente')) throw new ContrasenaConPagos(numero);
}

/**
 * Un documento que tuvo pagos en la contraseña (vigentes **o anulados**: la llave hacia `contrasena_documentos` lo exige)
 * no se quita de ella. La contraseña con pagos sí se edita: se quitan solo los documentos sin pagos.
 * @throws DocumentoConPagosEnLaContrasena
 */
export function exigirDocumentoSinPagosEnLaContrasena(
  etiqueta: string,
  documentoId: string,
  lineas: readonly LineaDePago[],
): void {
  if (lineas.some(({ cargoId }) => cargoId === documentoId)) throw new DocumentoConPagosEnLaContrasena(etiqueta);
}
