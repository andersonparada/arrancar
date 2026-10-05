import { esFueraDePlazo } from './periodo-del-libro.js';
import type { MotivoSinCredito, TipoDeDocumento } from './tipos-de-documento.js';

/** Lo que el dominio necesita para decidir si el documento da crédito fiscal. Montos en centavos. */
export interface DatosParaElMotivo {
  tipo: TipoDeDocumento;
  muestraEnReportesSat: boolean;
  /** El usuario marcó «no vinculado» (la compra no es de la actividad gravada). */
  noVinculado: boolean;
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

function motivoDeUnaFactura(datos: DatosParaElMotivo): MotivoSinCredito | null {
  if (datos.iva === 0 && datos.exento === datos.total) return 'exento';
  if (datos.noVinculado) return 'no_vinculado';
  return esFueraDePlazo(datos.periodo, datos.fechaDeEmision) ? 'fuera_de_plazo' : null;
}

function avisosDe(motivo: MotivoSinCredito | null, tipo: TipoDeDocumento): string[] {
  return motivo === 'fuera_de_plazo' && tipo !== 'nota_de_credito' ? [AVISO_FUERA_DE_PLAZO] : [];
}

/**
 * Decide el motivo sin crédito fiscal, en este orden: casilla SAT desmarcada, ninguno; pequeño
 * contribuyente; nota de crédito, el de su factura tal cual (su propia antigüedad nunca le da motivo); todo exento con IVA cero, `exento`; el usuario
 * marcó no vinculado; período pasado de emisión + 2 meses, `fuera_de_plazo` (con avisos).
 */
export function determinarMotivoSinCredito(datos: DatosParaElMotivo): ResultadoDelMotivo {
  let motivo: MotivoSinCredito | null;
  if (!datos.muestraEnReportesSat) motivo = null;
  else if (datos.tipo === 'factura_pequeno_contribuyente') motivo = 'pequeno_contribuyente';
  else if (datos.tipo === 'nota_de_credito') motivo = datos.motivoDeLaFactura ?? null;
  else motivo = motivoDeUnaFactura(datos);
  return { motivo, avisos: avisosDe(motivo, datos.tipo) };
}
