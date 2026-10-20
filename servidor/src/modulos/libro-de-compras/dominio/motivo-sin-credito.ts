import type { RegimenDeIva } from './datos-fiscales-de-empresa.js';
import { esFueraDePlazo } from './periodo-del-libro.js';
import { AVISO_DE_NOTA_DE_DEBITO_TARDIA, esNotaDeDebitoTardia } from './plazo-de-la-nota-de-debito.js';
import {
  MOTIVO_DE_LA_FAMILIA,
  MOTIVOS_SIN_IVA,
  type MotivoSinCredito,
  type TipoDeDocumento,
} from './tipos-de-documento.js';

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
  /** Lo no afecto que no es exento (turismo, timbre...); sin dato vale cero. */
  otrosImpuestos?: number;
  iva: number;
  periodo: string;
  fechaDeEmision: string;
  /** Solo en las notas: el motivo de la factura que corrigen. */
  motivoDeLaFactura?: MotivoSinCredito | null;
  /** Solo en la nota de crédito: el régimen con que se registró su factura (su foto); sin dato vale `general`. */
  regimenDeLaFactura?: RegimenDeIva;
  /** Solo en la nota de débito: la fecha de emisión de su factura, desde donde corre el plazo del art. 17. */
  fechaDeLaFactura?: string;
}

export interface ResultadoDelMotivo {
  motivo: MotivoSinCredito | null;
  avisos: string[];
}

const AVISO_FUERA_DE_PLAZO =
  'La factura está fuera del plazo para el crédito fiscal (art. 20 de la Ley del IVA): el IVA se suma al costo de cada línea.';

export const AVISO_NOTA_DE_DEBITO_SOBRE_FACTURA_SIN_CREDITO =
  'La factura se registró sin crédito fiscal (régimen anterior); consulte a su contador.';

export const AVISO_NOTA_CON_CAMBIO_DE_REGIMEN =
  'La factura dio crédito en el régimen anterior; consulte a su contador.';

/** Sin IVA, con algo exento y el resto solo otros impuestos: lo no afecto no convierte en exenta una compra. */
function esTodoExento(datos: DatosParaElMotivo): boolean {
  return datos.iva === 0 && datos.exento > 0 && datos.exento + (datos.otrosImpuestos ?? 0) === datos.total;
}

function motivoDeUnaFactura(datos: DatosParaElMotivo): MotivoSinCredito | null {
  if (esTodoExento(datos)) return 'exento';
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

function motivoDeUnaNotaDeDebitoConIva(datos: DatosParaElMotivo): MotivoSinCredito | null {
  if (!datos.empresaConCreditoFiscal) return 'empresa_sin_credito';
  if (datos.noVinculado || datos.motivoDeLaFactura === 'no_vinculado') return 'no_vinculado';
  const fechaDeLaFactura = datos.fechaDeLaFactura;
  if (fechaDeLaFactura && esNotaDeDebitoTardia(datos.fechaDeEmision, fechaDeLaFactura)) {
    return 'nota_de_debito_tardia';
  }
  return esFueraDePlazo(datos.periodo, datos.fechaDeEmision) ? 'fuera_de_plazo' : null;
}

const AVISO_DEL_MOTIVO: Partial<Record<MotivoSinCredito, string>> = {
  fuera_de_plazo: AVISO_FUERA_DE_PLAZO,
  nota_de_debito_tardia: AVISO_DE_NOTA_DE_DEBITO_TARDIA,
};

const avisoDelMotivo = (motivo: MotivoSinCredito | null): string[] => {
  const aviso = motivo ? AVISO_DEL_MOTIVO[motivo] : undefined;
  return aviso ? [aviso] : [];
};

/**
 * La nota de débito se evalúa como un documento propio (su período, su emisión y su IVA) y de su factura hereda solo
 * lo que es de la compra: el motivo de su familia sin IVA y `no_vinculado` (el usuario puede agregarlo, no quitarlo).
 * Una factura registrada sin crédito no se hereda: en un período general la nota da crédito, con aviso.
 */
function motivoDeUnaNotaDeDebito(datos: DatosParaElMotivo): ResultadoDelMotivo {
  const deLaFactura = datos.motivoDeLaFactura ?? null;
  if (deLaFactura && MOTIVOS_SIN_IVA.includes(deLaFactura)) return { motivo: deLaFactura, avisos: [] };
  if (esTodoExento(datos)) return { motivo: 'exento', avisos: [] };
  const motivo = motivoDeUnaNotaDeDebitoConIva(datos);
  const cambioDeRegimen = datos.empresaConCreditoFiscal && deLaFactura === 'empresa_sin_credito';
  return {
    motivo,
    avisos: [...(cambioDeRegimen ? [AVISO_NOTA_DE_DEBITO_SOBRE_FACTURA_SIN_CREDITO] : []), ...avisoDelMotivo(motivo)],
  };
}

/**
 * Decide el motivo sin crédito fiscal, en este orden: casilla SAT desmarcada, ninguno; familia sin IVA, su motivo
 * (pequeño contribuyente, agropecuario, primario o pecuario);
 * nota de crédito, el de su factura tal cual (su propia antigüedad nunca le da motivo; si su período no da crédito y
 * tiene IVA, `empresa_sin_credito`, con aviso si la factura sí dio crédito); todo exento con IVA cero, `exento`; empresa sin
 * crédito, `empresa_sin_credito` (no se miran `noVinculado` ni el art. 20); el usuario marcó no vinculado; período
 * pasado de emisión + 2 meses, `fuera_de_plazo` (con aviso).
 *
 * La nota de débito sigue su propio orden (`motivoDeUnaNotaDeDebito`): familia sin IVA, exento, empresa sin crédito,
 * no vinculado, art. 17 (`nota_de_debito_tardia`) y art. 20.
 */
export function determinarMotivoSinCredito(datos: DatosParaElMotivo): ResultadoDelMotivo {
  if (!datos.muestraEnReportesSat) return { motivo: null, avisos: [] };
  const deLaFamilia = MOTIVO_DE_LA_FAMILIA[datos.tipo];
  if (deLaFamilia) return { motivo: deLaFamilia, avisos: [] };
  if (datos.tipo === 'nota_de_credito') return motivoDeUnaNota(datos);
  if (datos.tipo === 'nota_de_debito') return motivoDeUnaNotaDeDebito(datos);
  const motivo = motivoDeUnaFactura(datos);
  return { motivo, avisos: motivo === 'fuera_de_plazo' ? [AVISO_FUERA_DE_PLAZO] : [] };
}
