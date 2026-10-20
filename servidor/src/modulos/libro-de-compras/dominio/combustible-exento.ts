export const AVISO_COMBUSTIBLE_EXENTO =
  'Este combustible está exento de IVA en esa fecha (Decreto 22-2026): revise el exento de la línea.';

/** Lo de la línea, en centavos, para decidir su exento cuando el combustible está exento de IVA. */
export interface LineaDeCombustibleExento {
  total: number;
  /** El IDP de la línea: el escrito o el que salió de los galones. */
  idp: number;
  otrosImpuestos: number;
  /** El exento que escribió el usuario; cero si no escribió ninguno. */
  exentoEscrito: number;
}

export interface ExentoDeCombustible {
  exento: number;
  aviso: string | null;
}

/**
 * Un combustible cuya vigencia es `iva_exento` (Decreto 22-2026) no lleva IVA: se propone como exento
 * `total − idp − otros impuestos`. Un exento distinto que escribió el usuario se respeta, con aviso.
 */
export function exentoDeCombustibleExento(linea: LineaDeCombustibleExento): ExentoDeCombustible {
  const propuesto = Math.max(0, linea.total - linea.idp - linea.otrosImpuestos);
  if (linea.exentoEscrito === 0 || linea.exentoEscrito === propuesto) return { exento: propuesto, aviso: null };
  return { exento: linea.exentoEscrito, aviso: AVISO_COMBUSTIBLE_EXENTO };
}
