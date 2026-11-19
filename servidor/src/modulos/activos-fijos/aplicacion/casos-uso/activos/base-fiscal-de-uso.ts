import { baseFiscal, type EntradaDeBaseFiscal } from '../../../dominio/depreciacion/base-fiscal.js';
import type { PropiedadesDeCosto } from '../../../dominio/costo.js';
import type { FiscalDelSaldo } from '../../puertos/repositorio-saldos-iniciales.js';

interface LoDeLaBase extends Omit<EntradaDeBaseFiscal, 'costos' | 'valorComoGanadoComunCentavos'> {
  costos: readonly PropiedadesDeCosto[];
  ganado: number;
}

/**
 * La base fiscal con que se abre el uso. El costo `saldo_inicial` pesa por su costo fiscal cargado (no por el contable)
 * y se le quita lo que la carga dejó fuera de la base (costo fiscal menos base fiscal); los demás costos pesan normal.
 */
export function baseFiscalDeUso({ ganado, costos, ...resto }: LoDeLaBase, saldo: FiscalDelSaldo | null): number {
  const conFiscalDelSaldo = costos.map((costo) =>
    saldo && costo.origen === 'saldo_inicial' ? { ...costo, montoCentavos: saldo.costoFiscalCentavos } : costo,
  );
  const base = baseFiscal({ ...resto, costos: conFiscalDelSaldo, valorComoGanadoComunCentavos: ganado });
  if (!saldo) return base;
  return Math.max(base - (saldo.costoFiscalCentavos - saldo.baseFiscalCentavos), 0);
}
