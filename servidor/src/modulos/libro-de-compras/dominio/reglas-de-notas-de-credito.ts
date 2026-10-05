import { IvaDeNotasExcedeElDeLaFactura, NotaConIvaDeFacturaExenta } from './errores-de-calculo.js';
import { MESES_DE_PLAZO_DEL_CREDITO, sumarMesesALaFecha } from './periodo-del-libro.js';
import type { MotivoSinCredito } from './tipos-de-documento.js';

/** Lo que la nota de crédito debe respetar de la factura que rebaja. Montos en centavos. */
export interface DatosDeLaFacturaAfectada {
  /** Solo en la nota de crédito: el motivo de la factura que rebaja. */
  motivoDeLaFactura?: MotivoSinCredito | null;
  /** IVA de la factura. Sin este dato no se compara el acumulado de las notas. */
  ivaDeLaFactura?: number;
  /** Suma del IVA de las demás notas vigentes de la factura (la nueva no entra). */
  ivaRebajadoPorOtrasNotas?: number;
}

/**
 * Una nota con IVA contra una factura exenta es un error, y el IVA de las notas vigentes más el de
 * la nueva no puede pasar del IVA de la factura. L3-5 consulta la factura y las demás notas.
 */
export function exigirNotaCoherenteConLaFactura(datos: DatosDeLaFacturaAfectada, ivaDeLaNota: number): void {
  if (datos.motivoDeLaFactura === 'exento' && ivaDeLaNota > 0) throw new NotaConIvaDeFacturaExenta();
  if (datos.ivaDeLaFactura === undefined) return;
  if ((datos.ivaRebajadoPorOtrasNotas ?? 0) + ivaDeLaNota > datos.ivaDeLaFactura) {
    throw new IvaDeNotasExcedeElDeLaFactura();
  }
}

export const AVISO_DE_NOTA_TARDIA =
  'La nota de crédito se emitió más de dos meses después de la factura: el emisor debió registrarla dentro de ese plazo (art. 17 de la Ley del IVA). Confírmelo con su proveedor. Aun así, rebájela en el período en que la recibe.';

/** Avisa si la nota se emitió más de dos meses después de la factura que rebaja, de fecha a fecha (no bloquea). */
export function avisosDeNotaTardia(fechaDeEmisionDeLaNota: string, fechaDeEmisionDeLaFactura: string): string[] {
  const limite = sumarMesesALaFecha(fechaDeEmisionDeLaFactura, MESES_DE_PLAZO_DEL_CREDITO);
  return fechaDeEmisionDeLaNota > limite ? [AVISO_DE_NOTA_TARDIA] : [];
}
