import {
  TipoDeDocumentoObligatorio,
  TipoDteIncoherente,
  TipoDteObligatorio,
  TipoDteSinFel,
} from './errores-de-documento.js';
import { FAMILIA_DEL_TIPO_DTE, type TipoDeDocumento, type TipoDte } from './tipos-de-documento.js';

/** Lo que el cuerpo dice del tipo de documento: la familia, el código de la SAT o los dos. */
export interface TipoSolicitado {
  tipo?: TipoDeDocumento | null;
  tipoDte?: TipoDte | null;
  autorizacionFel: string | null;
}

export interface TipoResuelto {
  tipo: TipoDeDocumento;
  /** `null` en un documento sin FEL (papel). */
  tipoDte: TipoDte | null;
}

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
 * sin FEL no se escribe.
 * @throws TipoDeDocumentoObligatorio, TipoDteObligatorio, TipoDteSinFel o TipoDteIncoherente.
 */
export function resolverTipoDeDocumento(solicitado: TipoSolicitado): TipoResuelto {
  const tipo = familiaDeclarada(solicitado);
  const tipoDte = solicitado.tipoDte ?? null;
  if (solicitado.autorizacionFel && !tipoDte) throw new TipoDteObligatorio();
  if (!solicitado.autorizacionFel && tipoDte) throw new TipoDteSinFel();
  return { tipo, tipoDte };
}
