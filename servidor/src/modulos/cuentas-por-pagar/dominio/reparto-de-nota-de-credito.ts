/** Un cargo vigente que todavía debe algo; el saldo es lo que falta pagar o rebajar, en centavos. */
export interface CargoConSaldo {
  id: string;
  saldoCentavos: number;
}

export interface AplicacionACargo {
  cargoId: string;
  montoCentavos: number;
}

export interface RepartoDeNota {
  aplicaciones: AplicacionACargo[];
  /** Lo que no encontró cargo donde aplicarse: queda como saldo libre de la nota. */
  saldoLibreCentavos: number;
}

/**
 * Reparte una nota de crédito recién recibida entre los cargos que le tocan, en el orden dado (su factura primero y
 * luego las notas de débito de esa factura, de la más antigua a la más nueva): a cada uno le rebaja hasta su saldo.
 * Lo que sobra queda como saldo libre de la nota (la factura tenía retenciones o la nota se apoya en notas de débito).
 */
export function repartirNotaDeCredito(totalCentavos: number, cargos: readonly CargoConSaldo[]): RepartoDeNota {
  const aplicaciones: AplicacionACargo[] = [];
  let porAplicar = totalCentavos;
  for (const { id, saldoCentavos } of cargos) {
    const montoCentavos = Math.min(porAplicar, Math.max(saldoCentavos, 0));
    if (montoCentavos <= 0) continue;
    aplicaciones.push({ cargoId: id, montoCentavos });
    porAplicar -= montoCentavos;
  }
  return { aplicaciones, saldoLibreCentavos: porAplicar };
}
