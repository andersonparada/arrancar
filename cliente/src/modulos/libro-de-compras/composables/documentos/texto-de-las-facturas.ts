/** El primer renglón del selector «Factura que corrige»: sin proveedor invita a elegirlo; con él, avisa si no hay facturas. */
export function textoInicialDeLasFacturas(datos: {
  hayProveedor: boolean;
  sinOpciones: boolean;
  esDebito: boolean;
}): string {
  if (!datos.hayProveedor) return 'Primero elija el proveedor';
  if (!datos.sinOpciones) return 'Elija la factura';
  return datos.esDebito
    ? 'Este proveedor no tiene facturas vigentes en el libro'
    : 'Este proveedor no tiene facturas vigentes';
}
