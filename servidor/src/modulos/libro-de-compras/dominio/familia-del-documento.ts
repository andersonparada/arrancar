import {
  FacturaEspecialNoDisponible,
  FamiliaAunNoVigente,
  FamiliaDerogada,
  TipoDeDocumentoObligatorio,
  TipoDteIncoherente,
  TipoDteObligatorio,
  TipoDteSinFel,
} from './errores-de-familia.js';
import {
  FAMILIA_DEL_TIPO_DTE,
  INICIO_DEL_PRIMARIO_Y_PECUARIO,
  MOTIVO_DE_LA_FAMILIA,
  type TipoDeDocumento,
  type TipoDte,
} from './tipos-de-documento.js';

/** Lo que el cuerpo dice del tipo de documento: la familia, el código de la SAT o los dos. */
export interface TipoSolicitado {
  tipo?: TipoDeDocumento | null;
  tipoDte?: TipoDte | null;
  autorizacionFel: string | null;
}

export interface TipoResuelto {
  tipo: TipoDeDocumento;
  /** `null` en un documento sin FEL. */
  tipoDte: TipoDte | null;
}

/** Las familias derogadas (Decreto 31-2024): solo se registran si se emitieron antes de la fecha de derogación. */
const FAMILIAS_DEROGADAS: readonly TipoDeDocumento[] = [
  'factura_pequeno_contribuyente_electronico',
  'factura_contribuyente_agropecuario',
];

export const AVISO_DE_PRIMARIO_Y_PECUARIO =
  'Productor primario o pecuario: el impuesto lo paga el productor; no se retiene IVA ni ISR.';

/** La familia no cobra IVA: lleva su propio motivo (pequeño contribuyente, agropecuario, primario o pecuario). */
export const esFamiliaSinIva = (tipo: TipoDeDocumento): boolean => tipo in MOTIVO_DE_LA_FAMILIA;

function familiaDeclarada({ tipo, tipoDte }: TipoSolicitado): TipoDeDocumento {
  if (tipoDte) {
    const deducida = FAMILIA_DEL_TIPO_DTE[tipoDte];
    if (tipo && tipo !== deducida) throw new TipoDteIncoherente(tipoDte, tipo);
    return deducida;
  }
  if (!tipo) throw new TipoDeDocumentoObligatorio();
  return tipo;
}

/**
 * La familia se deduce del código de la SAT; si también llega `tipo` debe coincidir. Con FEL el código es obligatorio;
 * sin FEL no se escribe. La factura especial se registra en otro paso (R2-6).
 * @throws TipoDeDocumentoObligatorio, TipoDteObligatorio, TipoDteSinFel, TipoDteIncoherente o FacturaEspecialNoDisponible.
 */
export function resolverTipoDeDocumento(solicitado: TipoSolicitado): TipoResuelto {
  const tipo = familiaDeclarada(solicitado);
  const tipoDte = solicitado.tipoDte ?? null;
  if (solicitado.autorizacionFel && !tipoDte) throw new TipoDteObligatorio();
  if (!solicitado.autorizacionFel && tipoDte) throw new TipoDteSinFel();
  if (tipo === 'factura_especial') throw new FacturaEspecialNoDisponible();
  return { tipo, tipoDte };
}

/**
 * Las familias derogadas se emitieron antes de la fecha de derogación (variable de instalación) y la del primario y
 * pecuario desde su inicio. La nota de crédito sobre ellas no se mide con su fecha: quien llama pasa la **familia y la
 * fecha de su factura**.
 * @throws FamiliaDerogada o FamiliaAunNoVigente.
 */
export function exigirFechaDeLaFamilia(
  datos: { tipo: TipoDeDocumento; fechaDeEmision: string },
  fechaDeDerogacion: string,
): void {
  const { tipo, fechaDeEmision } = datos;
  if (FAMILIAS_DEROGADAS.includes(tipo) && fechaDeEmision >= fechaDeDerogacion) {
    throw new FamiliaDerogada(fechaDeDerogacion);
  }
  if (tipo === 'factura_primario_pecuario' && fechaDeEmision < INICIO_DEL_PRIMARIO_Y_PECUARIO) {
    throw new FamiliaAunNoVigente(INICIO_DEL_PRIMARIO_Y_PECUARIO);
  }
}

/** Aviso que no bloquea de la familia: el primario y pecuario paga su impuesto y no se le retiene nada. */
export function avisosDeLaFamilia(tipo: TipoDeDocumento): string[] {
  return tipo === 'factura_primario_pecuario' ? [AVISO_DE_PRIMARIO_Y_PECUARIO] : [];
}
