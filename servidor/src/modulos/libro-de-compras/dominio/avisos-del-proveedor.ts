import type { DatosFiscalesDeProveedor } from './datos-fiscales-de-proveedor.js';

export const AVISO_DE_PROVEEDOR_NO_DOMICILIADO =
  'El proveedor no está domiciliado: corresponde la retención del ISR de no residentes (Decreto 10-2012, rentas de no residentes), con una tasa que depende del tipo de renta. Este sistema no la calcula: revísela con su contador.';

/** Aviso que no bloquea sobre los datos fiscales del proveedor: a un no domiciliado le toca el ISR de no residentes. */
export function avisosDelProveedor(proveedor: DatosFiscalesDeProveedor): string[] {
  return proveedor.instantanea().regimenIsr === 'no_domiciliado' ? [AVISO_DE_PROVEEDOR_NO_DOMICILIADO] : [];
}
