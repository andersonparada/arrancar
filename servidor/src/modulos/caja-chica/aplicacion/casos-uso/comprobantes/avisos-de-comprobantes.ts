import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { montoLegible } from '../../../../core/compartido/dominio/monto-legible.js';
import type { Comprobante } from '../../../dominio/comprobantes.js';

const CAUSAS_DE_FUERA_DEL_LIBRO: Record<string, string> = {
  sin_fel: 'no tiene FEL',
  fel_a_consumidor_final: 'la FEL está a nombre de consumidor final',
  fel_a_otro_nit: 'la FEL está a nombre de otro NIT',
  recibo_fel: 'es un recibo FEL',
};

/** Aviso (no bloquea) de un documento que quedó fuera del libro de compras; cubre el caso C6 del dictamen. */
export function avisoDeFueraDelLibro({ documento }: Pick<Comprobante, 'documento'>): string[] {
  if (!documento || documento.enElLibro) return [];
  const causa = CAUSAS_DE_FUERA_DEL_LIBRO[documento.motivoFueraDelLibro ?? ''];
  return [
    `No da crédito fiscal ni es deducible: el documento quedó fuera del libro de compras${causa ? ` (${causa})` : ''}.`,
  ];
}

/** Lo que se responde al libro cuando una factura con retención llega a la bandeja (§5.4 a, punto 2). */
export function avisoDeRetencionEnLaBandeja({
  montoRetenidoCentavos,
}: Pick<Comprobante, 'montoRetenidoCentavos'>): string {
  return `Quedó en la bandeja de Caja chica: lleva retención de ${montoLegible(deCentavos(montoRetenidoCentavos))} (la entera la empresa). Para pagarla del fondo, asígnela con el permiso de excepción y un motivo.`;
}
