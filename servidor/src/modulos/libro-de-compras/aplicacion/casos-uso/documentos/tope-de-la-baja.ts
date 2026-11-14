import type { FacturaConNotas } from '../../../dominio/tope-de-notas.js';
import { exigirQueLasNotasDeCreditoSigaCabiendo } from '../../../dominio/tope-de-notas.js';
import type { DocumentoGuardado } from '../../puertos/puertos-de-baja-de-documentos.js';
import type { ConsultasDeDocumentos } from '../../puertos/puertos-de-documentos.js';
import type {
  FacturaAnteriorConNotas,
  RepositorioDeFacturasAnteriores,
} from '../../puertos/puertos-de-facturas-anteriores.js';

export interface DependenciasDelTopeDeLaBaja {
  /** Para bloquear la factura de una nota de débito y revisar el tope de sus notas de crédito. */
  consultas: ConsultasDeDocumentos;
  /** Lo mismo cuando la factura es del sistema anterior. */
  facturasAnteriores: RepositorioDeFacturasAnteriores;
}

/** La factura anterior con sus notas de débito del sistema anterior sumadas a las del libro (diseño §2.1). */
function conSusNotas(factura: FacturaAnteriorConNotas): FacturaConNotas {
  const { notas } = factura;
  return {
    total: factura.total,
    iva: factura.iva,
    totalDeNotasDeCredito: notas.totalDeNotasDeCredito,
    ivaDeNotasDeCredito: notas.ivaDeNotasDeCredito,
    totalDeNotasDeDebito: notas.totalDeNotasDeDebito + factura.notasDeDebitoAnterioresTotal,
    ivaDeNotasDeDebito: notas.ivaDeNotasDeDebito + factura.notasDeDebitoAnterioresIva,
  };
}

async function facturaDeLaNota(
  { consultas, facturasAnteriores }: DependenciasDelTopeDeLaBaja,
  { documento }: DocumentoGuardado,
): Promise<FacturaConNotas | null> {
  if (documento.facturaAnterior) {
    const anterior = await facturasAnteriores.buscarPorId(documento.facturaAnterior.id, true);
    return anterior ? conSusNotas(anterior) : null;
  }
  if (documento.documentoAfectadoId === null) return null;
  return consultas.buscarFacturaParaNota(documento.documentoAfectadoId, true);
}

/**
 * Anular o eliminar una nota de débito no deja a las notas de crédito de su factura pasadas de su valor. La factura
 * (del libro o del sistema anterior) se bloquea (`for update`) antes de sumar, así una nota de crédito que se
 * registra a la vez se ordena con la baja. Los demás documentos no tienen tope.
 * @throws NotaDeDebitoSostieneNotasDeCredito.
 */
export async function exigirQueLaBajaRespeteElTope(
  dependencias: DependenciasDelTopeDeLaBaja,
  guardado: DocumentoGuardado,
): Promise<void> {
  const { documento } = guardado;
  if (documento.tipo !== 'nota_de_debito') return;
  const factura = await facturaDeLaNota(dependencias, guardado);
  if (!factura) return;
  exigirQueLasNotasDeCreditoSigaCabiendo(factura, { total: documento.totales.total, iva: documento.totales.iva });
}
