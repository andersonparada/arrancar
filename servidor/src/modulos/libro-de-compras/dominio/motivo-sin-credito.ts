import { esFueraDePlazo } from './periodo-del-libro.js';
import type { MotivoSinCredito, TipoDeDocumento } from './tipos-de-documento.js';

/** Lo que el dominio necesita para decidir si el documento da crédito fiscal. Montos en centavos. */
export interface DatosParaElMotivo {
  tipo: TipoDeDocumento;
  muestraEnReportesSat: boolean;
  /** El usuario marcó «no vinculado» (la compra no es de la actividad gravada). */
  noVinculado: boolean;
  /** La empresa acredita el IVA de sus compras en el período del documento (`daCreditoFiscal`). */
  empresaConCreditoFiscal: boolean;
  total: number;
  exento: number;
  iva: number;
  periodo: string;
  fechaDeEmision: string;
  /** Solo en la nota de crédito: el motivo de la factura que rebaja. */
  motivoDeLaFactura?: MotivoSinCredito | null;
}

export interface ResultadoDelMotivo {
  motivo: MotivoSinCredito | null;
  avisos: string[];
}

const AVISO_FUERA_DE_PLAZO =
  'La factura está fuera del plazo para el crédito fiscal (art. 20 de la Ley del IVA): el IVA se suma al costo de cada línea.';

export const AVISO_NOTA_CON_CAMBIO_DE_REGIMEN =
  'La factura dio crédito en el régimen anterior; consulte a su contador.';

function motivoDeUnaFactura(datos: DatosParaElMotivo): MotivoSinCredito | null {
  if (datos.iva === 0 && datos.exento === datos.total) return 'exento';
  if (!datos.empresaConCreditoFiscal) return 'empresa_sin_credito';
  if (datos.noVinculado) return 'no_vinculado';
  return esFueraDePlazo(datos.periodo, datos.fechaDeEmision) ? 'fuera_de_plazo' : null;
}

/** La nota hereda el motivo de su factura; si la factura dio crédito y la empresa ya no lo tiene, `empresa_sin_credito`. */
function motivoDeUnaNota(datos: DatosParaElMotivo): ResultadoDelMotivo {
  const deLaFactura = datos.motivoDeLaFactura ?? null;
  if (deLaFactura === null && !datos.empresaConCreditoFiscal) {
    return { motivo: 'empresa_sin_credito', avisos: [AVISO_NOTA_CON_CAMBIO_DE_REGIMEN] };
  }
  return { motivo: deLaFactura, avisos: [] };
}

/**
 * Decide el motivo sin crédito fiscal, en este orden: casilla SAT desmarcada, ninguno; pequeño contribuyente;
 * nota de crédito, el de su factura tal cual (su propia antigüedad nunca le da motivo; si la factura dio crédito y
 * la empresa ya no lo tiene, `empresa_sin_credito` con aviso); todo exento con IVA cero, `exento`; empresa sin
 * crédito, `empresa_sin_credito` (no se miran `noVinculado` ni el art. 20); el usuario marcó no vinculado; período
 * pasado de emisión + 2 meses, `fuera_de_plazo` (con aviso).
 */
export function determinarMotivoSinCredito(datos: DatosParaElMotivo): ResultadoDelMotivo {
  if (!datos.muestraEnReportesSat) return { motivo: null, avisos: [] };
  if (datos.tipo === 'factura_pequeno_contribuyente') return { motivo: 'pequeno_contribuyente', avisos: [] };
  if (datos.tipo === 'nota_de_credito') return motivoDeUnaNota(datos);
  const motivo = motivoDeUnaFactura(datos);
  return { motivo, avisos: motivo === 'fuera_de_plazo' ? [AVISO_FUERA_DE_PLAZO] : [] };
}
