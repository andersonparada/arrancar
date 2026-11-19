import type { TotalesDeUnConcepto } from './dto/reportes-por-concepto.dto.js';

/** Los pagos en efectivo salen del banco en la fecha del retiro, no en la del pago: el reporte lo avisa (CP4-EB). */
export const LEYENDA_DE_PAGOS_EN_EFECTIVO =
  'Los pagos en efectivo a proveedores se muestran en la fecha del retiro del banco, no en la del pago. ' +
  'Es un reporte de gestión.';

/** Los gastos de caja chica entran al flujo cuando se repone el fondo, no cuando se gastan (CCL-B1, P-CPE-2). */
export const LEYENDA_DE_CAJA_CHICA =
  'Los gastos de caja chica se muestran en la fecha de su reposición, no en la del gasto.';

/** Los gastos de un anticipo entran al flujo cuando se entrega el anticipo (CCL-B1, P-CPE-2). */
export const LEYENDA_DE_ANTICIPOS = 'Los gastos de anticipos se muestran en la fecha de entrega del anticipo.';

interface Leyenda {
  texto: string;
  claves: readonly string[];
}

const LEYENDAS: readonly Leyenda[] = [
  { texto: LEYENDA_DE_PAGOS_EN_EFECTIVO, claves: ['efectivo_para_pagos', 'faltante_de_efectivo'] },
  { texto: LEYENDA_DE_CAJA_CHICA, claves: ['reintegro_de_caja_chica', 'reintegro_de_caja_chica_de_activo'] },
  {
    texto: LEYENDA_DE_ANTICIPOS,
    claves: ['anticipo_por_liquidar', 'gasto_de_anticipo', 'gasto_de_anticipo_de_activo'],
  },
];

/** Las leyendas que corresponden a los conceptos con movimiento en el período, una tras otra; nulo si ninguna. */
export function leyendasDelFlujo(totales: readonly TotalesDeUnConcepto[]): string | null {
  const presentes = new Set(totales.map((t) => t.claveDeSistema));
  const textos = LEYENDAS.filter((l) => l.claves.some((clave) => presentes.has(clave))).map((l) => l.texto);
  return textos.length ? textos.join(' ') : null;
}
