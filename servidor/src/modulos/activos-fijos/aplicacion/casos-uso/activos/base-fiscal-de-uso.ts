import { baseFiscal, costoFiscal, type EntradaDeBaseFiscal } from '../../../dominio/depreciacion/base-fiscal.js';
import type { PropiedadesDeCosto } from '../../../dominio/costo.js';
import type { FiscalDelSaldo } from '../../puertos/repositorio-saldos-iniciales.js';

interface LoDeLaBase extends Omit<EntradaDeBaseFiscal, 'costos' | 'valorComoGanadoComunCentavos'> {
  costos: readonly PropiedadesDeCosto[];
  ganado: number;
}

/** El costo `saldo_inicial` pesa por su costo fiscal cargado (no por el contable); los demás costos pesan normal. */
function conFiscalDelSaldo(costos: readonly PropiedadesDeCosto[], saldo: FiscalDelSaldo | null) {
  return costos.map((costo) =>
    saldo && costo.origen === 'saldo_inicial' ? { ...costo, montoCentavos: saldo.costoFiscalCentavos } : costo,
  );
}

/**
 * La base fiscal con que se abre el uso. El costo `saldo_inicial` pesa por su costo fiscal cargado (no por el contable)
 * y se le quita lo que la carga dejó fuera de la base (costo fiscal menos base fiscal); los demás costos pesan normal.
 */
export function baseFiscalDeUso({ ganado, costos, ...resto }: LoDeLaBase, saldo: FiscalDelSaldo | null): number {
  const base = baseFiscal({ ...resto, costos: conFiscalDelSaldo(costos, saldo), valorComoGanadoComunCentavos: ganado });
  if (!saldo) return base;
  return Math.max(base - (saldo.costoFiscalCentavos - saldo.baseFiscalCentavos), 0);
}

/** El costo fiscal del activo, el que se recupera al vender (A1): todos los costos fiscales, con el del saldo inicial. */
export function costoFiscalDeActivo(costos: readonly PropiedadesDeCosto[], saldo: FiscalDelSaldo | null): number {
  return costoFiscal(conFiscalDelSaldo(costos, saldo));
}
