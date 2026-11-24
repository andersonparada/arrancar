/**
 * Una factura especial (`FESP`) la emite el comprador y retiene el IVA; el vendedor es el receptor (Ley del IVA,
 * art. 52). Para la empresa que la recibe es una venta y nunca da crédito fiscal. Si el emisor es el mismo NIT del
 * receptor (la propia empresa), es su compra: no se trata como venta.
 */
export function esFacturaEspecialDeVenta(dte: { tipoDte: string; nitEmisor: string; nitReceptor: string }): boolean {
  return dte.tipoDte === 'FESP' && dte.nitEmisor !== dte.nitReceptor;
}
