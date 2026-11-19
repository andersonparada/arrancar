import type { ComprobanteParaDesglosar, DesgloseDeReposicion } from './reposiciones.js';

type Parte = keyof DesgloseDeReposicion;

/** Las partes en el orden en que absorben lo que otra deja en negativo: activo, operación, faltante. */
const ORDEN_DE_ABSORCION: readonly Parte[] = ['activoCentavos', 'operacionCentavos', 'faltanteCentavos'];

/** Reparte una deuda entre las demás partes, de la primera con saldo a la última. */
function cobrarALasOtras(partes: DesgloseDeReposicion, por: { deudora: Parte; deuda: number }): void {
  let pendiente = por.deuda;
  for (const otra of ORDEN_DE_ABSORCION.filter((clave) => clave !== por.deudora)) {
    const quita = Math.min(pendiente, Math.max(partes[otra], 0));
    partes[otra] -= quita;
    pendiente -= quita;
  }
}

/** Lo que una parte negativa le quita a las demás. */
function absorberLoNegativo(original: DesgloseDeReposicion): DesgloseDeReposicion {
  const partes = { ...original };
  for (const deudora of ORDEN_DE_ABSORCION) {
    if (partes[deudora] >= 0) continue;
    const deuda = -partes[deudora];
    partes[deudora] = 0;
    cobrarALasOtras(partes, { deudora, deuda });
  }
  return partes;
}

/** A qué parte del desglose va un comprobante: el faltante al suyo; lo demás, a operación o a activo fijo. */
function parteDe({ clase, conActivoFijo }: ComprobanteParaDesglosar): Parte {
  if (clase === 'faltante') return 'faltanteCentavos';
  return conActivoFijo ? 'activoCentavos' : 'operacionCentavos';
}

/**
 * Reparte lo que se repone por concepto de Bancos (§5.6 del diseño): `reintegro_de_caja_chica` (gastos sin activo fijo,
 * menos notas de crédito y sobrantes), `reintegro_de_caja_chica_de_activo` (con activo fijo) y `faltante_de_efectivo`. Si lo
 * que resta deja una parte en negativo se rebaja de la de activo y, después, de las otras, para que todas sean positivas
 * y sigan sumando el total.
 */
export function desglosarLaReposicion(comprobantes: readonly ComprobanteParaDesglosar[]): DesgloseDeReposicion {
  const partes: DesgloseDeReposicion = { operacionCentavos: 0, activoCentavos: 0, faltanteCentavos: 0 };
  for (const comprobante of comprobantes) partes[parteDe(comprobante)] += comprobante.firmadoCentavos;
  return absorberLoNegativo(partes);
}

/** El total de lo que se repone: la suma firmada. */
export const totalDeLaReposicion = (comprobantes: readonly ComprobanteParaDesglosar[]): number =>
  comprobantes.reduce((suma, { firmadoCentavos }) => suma + firmadoCentavos, 0);
