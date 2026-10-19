import type { RegimenDeIva } from './datos-fiscales-de-empresa.js';
import { esFueraDePlazo } from './periodo-del-libro.js';
import { MOTIVO_DE_LA_FAMILIA, type MotivoSinCredito, type TipoDeDocumento } from './tipos-de-documento.js';

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
  /** Solo en la nota de crédito: el régimen con que se registró su factura (su foto); sin dato vale `general`. */
  regimenDeLaFactura?: RegimenDeIva;
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

/**
 * La nota cuyo período no da crédito y lleva IVA es `empresa_sin_credito` (con aviso si su factura sí dio crédito en
 * el régimen anterior); si no, hereda el motivo de su factura tal cual.
 */
function motivoDeUnaNota(datos: DatosParaElMotivo): ResultadoDelMotivo {
  const deLaFactura = datos.motivoDeLaFactura ?? null;
  if (datos.empresaConCreditoFiscal || datos.iva === 0) return { motivo: deLaFactura, avisos: [] };
  const facturaDioCredito = deLaFactura === null && (datos.regimenDeLaFactura ?? 'general') === 'general';
  return { motivo: 'empresa_sin_credito', avisos: facturaDioCredito ? [AVISO_NOTA_CON_CAMBIO_DE_REGIMEN] : [] };
}

/**
 * Decide el motivo sin crédito fiscal, en este orden: casilla SAT desmarcada, ninguno; familia sin IVA, su motivo
 * (pequeño contribuyente, agropecuario, primario o pecuario);
 * nota de crédito, el de su factura tal cual (su propia antigüedad nunca le da motivo; si su período no da crédito y
 * tiene IVA, `empresa_sin_credito`, con aviso si la factura sí dio crédito); todo exento con IVA cero, `exento`; empresa sin
 * crédito, `empresa_sin_credito` (no se miran `noVinculado` ni el art. 20); el usuario marcó no vinculado; período
 * pasado de emisión + 2 meses, `fuera_de_plazo` (con aviso).
 */
export function determinarMotivoSinCredito(datos: DatosParaElMotivo): ResultadoDelMotivo {
  if (!datos.muestraEnReportesSat) return { motivo: null, avisos: [] };
  const deLaFamilia = MOTIVO_DE_LA_FAMILIA[datos.tipo];
  if (deLaFamilia) return { motivo: deLaFamilia, avisos: [] };
  if (datos.tipo === 'nota_de_credito') return motivoDeUnaNota(datos);
  const motivo = motivoDeUnaFactura(datos);
  return { motivo, avisos: motivo === 'fuera_de_plazo' ? [AVISO_FUERA_DE_PLAZO] : [] };
}
