import type { ClaseDeComprobante, Comprobante } from './comprobantes.js';
import { sinRespaldoFiscal } from './documento-anulado.js';

export const SIN_CONCEPTO = 'Sin concepto';
export const VARIOS_CONCEPTOS = 'Varios conceptos';

const MOTIVO_DE_DOCUMENTO_ANULADO = 'La FEL fue anulada por su emisor';

const CAUSAS_DE_FUERA_DEL_LIBRO: Record<string, string> = {
  sin_fel: 'No tiene FEL',
  fel_a_consumidor_final: 'La FEL está a nombre de consumidor final',
  fel_a_otro_nit: 'La FEL está a nombre de otro NIT',
  recibo_fel: 'Es un recibo FEL',
};

/**
 * Un documento del libro es deducible si quedó dentro del libro y su FEL sigue vigente (o ya la reemplazó otra); un vale
 * de gasto, un faltante, un sobrante o un documento anulado por su emisor sin reemplazo, nunca.
 */
export const esDeducible = (
  comprobante: Pick<Comprobante, 'clase' | 'documento' | 'motivoDocumentoAnulado' | 'seguimiento'>,
): boolean =>
  comprobante.clase === 'documento' && (comprobante.documento?.enElLibro ?? false) && !sinRespaldoFiscal(comprobante);

/** Lo que el comprobante aporta al fondo: positivo, salvo las notas de crédito y los sobrantes, que restan. */
export const firmadoDelComprobante = ({
  montoCentavos,
  resta,
}: Pick<Comprobante, 'montoCentavos' | 'resta'>): number => (resta ? -montoCentavos : montoCentavos);

/** El concepto de gasto de un comprobante según los conceptos de las líneas de su documento. */
export function conceptoDeLasLineas(nombres: readonly string[]): string {
  const distintos = [...new Set(nombres)];
  if (distintos.length === 0) return SIN_CONCEPTO;
  return distintos.length === 1 ? distintos[0]! : VARIOS_CONCEPTOS;
}

const CONCEPTOS_DE_AJUSTE: Partial<Record<ClaseDeComprobante, string>> = {
  faltante: 'Faltante de arqueo',
  sobrante: 'Sobrante de arqueo',
};

/** El concepto de un faltante o sobrante de arqueo; los demás comprobantes lo traen de su vale o su documento. */
export const conceptoDeAjuste = (clase: ClaseDeComprobante): string | null => CONCEPTOS_DE_AJUSTE[clase] ?? null;

/** Por qué un gasto no tiene documento fiscal válido (CC-R3): el motivo del vale o la causa de quedar fuera del libro. */
export function motivoSinDocumentoFiscal(
  comprobante: Pick<
    Comprobante,
    'clase' | 'documento' | 'motivoSinDocumento' | 'motivoDocumentoAnulado' | 'seguimiento'
  >,
): string {
  if (comprobante.clase === 'vale_de_gasto') return comprobante.motivoSinDocumento ?? '';
  if (sinRespaldoFiscal(comprobante)) return `${MOTIVO_DE_DOCUMENTO_ANULADO}: ${comprobante.motivoDocumentoAnulado}`;
  const causa = comprobante.documento?.motivoFueraDelLibro ?? '';
  return CAUSAS_DE_FUERA_DEL_LIBRO[causa] ?? 'Quedó fuera del libro de compras';
}
