import type { RegimenDeIva } from './datos-fiscales-de-empresa.js';
import { IvaDeNotasExcedeElDeLaFactura, NotaConIvaDeFacturaExenta } from './errores-de-calculo.js';
import { MESES_DE_PLAZO_DEL_CREDITO } from './periodo-del-libro.js';
import { venceLaVispera } from './plazo-en-meses.js';
import type { MotivoSinCredito, TipoDeNota } from './tipos-de-documento.js';

/** Lo que una nota debe respetar de la factura que corrige. Montos en centavos. */
export interface DatosDeLaFacturaAfectada {
  /** Solo en las notas: el motivo de la factura que corrigen. */
  motivoDeLaFactura?: MotivoSinCredito | null;
  /** El régimen con que se registró la factura (su foto). */
  regimenDeLaFactura?: RegimenDeIva;
  /** Solo en la nota de débito: la fecha de emisión de su factura. */
  fechaDeLaFactura?: string;
  /** IVA de la factura más el de sus notas de débito vigentes, que es lo que las notas de crédito pueden rebajar. */
  ivaDeLaFactura?: number;
  /** Suma del IVA de las notas de crédito vigentes de la factura (la nueva no entra). */
  ivaRebajadoPorOtrasNotas?: number;
}

/**
 * Una nota con IVA contra una factura exenta es un error. En la nota de crédito, además, el IVA de las notas vigentes
 * más el de la nueva no puede pasar del IVA de la factura (con el de sus notas de débito); la nota de débito no
 * tiene tope. L3-5 consulta la factura y las demás notas.
 */
export function exigirNotaCoherenteConLaFactura(
  datos: DatosDeLaFacturaAfectada,
  nota: { tipo: TipoDeNota; iva: number },
): void {
  if (datos.motivoDeLaFactura === 'exento' && nota.iva > 0) throw new NotaConIvaDeFacturaExenta(nota.tipo);
  if (nota.tipo !== 'nota_de_credito' || datos.ivaDeLaFactura === undefined) return;
  if ((datos.ivaRebajadoPorOtrasNotas ?? 0) + nota.iva > datos.ivaDeLaFactura) {
    throw new IvaDeNotasExcedeElDeLaFactura();
  }
}

export const AVISO_DE_NOTA_TARDIA =
  'La nota de crédito se emitió más de dos meses después de la factura: el emisor debió registrarla dentro de ese plazo (art. 17 de la Ley del IVA). Confírmelo con su proveedor. Aun así, rebájela en el período en que la recibe.';

/** Avisa si la nota se emitió después de que venció el plazo de dos meses de la factura (`venceLaVispera`; no bloquea). */
export function avisosDeNotaTardia(fechaDeEmisionDeLaNota: string, fechaDeEmisionDeLaFactura: string): string[] {
  const limite = venceLaVispera(fechaDeEmisionDeLaFactura, MESES_DE_PLAZO_DEL_CREDITO);
  return fechaDeEmisionDeLaNota > limite ? [AVISO_DE_NOTA_TARDIA] : [];
}
