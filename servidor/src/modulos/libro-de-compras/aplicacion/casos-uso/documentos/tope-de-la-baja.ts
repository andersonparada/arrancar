import { exigirQueLasNotasDeCreditoSigaCabiendo } from '../../../dominio/tope-de-notas.js';
import type { DocumentoGuardado } from '../../puertos/puertos-de-baja-de-documentos.js';
import type { ConsultasDeDocumentos } from '../../puertos/puertos-de-documentos.js';

/**
 * Anular o eliminar una nota de débito no deja a las notas de crédito de su factura pasadas de su valor. Bloquea la
 * factura (`for update`) antes de sumar, así una nota de crédito que se registra a la vez se ordena con la baja. Los
 * demás documentos no tienen tope.
 * @throws NotaDeDebitoSostieneNotasDeCredito.
 */
export async function exigirQueLaBajaRespeteElTope(
  consultas: ConsultasDeDocumentos,
  { documento }: DocumentoGuardado,
): Promise<void> {
  if (documento.tipo !== 'nota_de_debito' || documento.documentoAfectadoId === null) return;
  const factura = await consultas.buscarFacturaParaNota(documento.documentoAfectadoId, true);
  if (!factura) return;
  exigirQueLasNotasDeCreditoSigaCabiendo(factura, { total: documento.totales.total, iva: documento.totales.iva });
}
