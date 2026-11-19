/** Lo que explica la ventana al anular un cheque: qué pasa según el mes en que quedó. */
export const TEXTO_DE_ANULACION = (numero?: number, moduloDeOrigen?: string | null): string =>
  `¿Anular el cheque No. ${numero ?? ''}? Conserva su número: no se vuelve a usar. Si su mes sigue abierto, su movimiento deja de contar; si ya está conciliado (quedó en circulación y nunca se cobró), se crea una nota de crédito inversa con la fecha de abajo.` +
  (moduloDeOrigen === 'cuentas-por-pagar' ? ` ${AVISO_DEL_PAGO_DE_CUENTAS_POR_PAGAR}` : '');

/** Si el cheque lo generó un pago de Cuentas por pagar, anularlo anula ese pago (lo hace el servidor). */
export const AVISO_DEL_PAGO_DE_CUENTAS_POR_PAGAR =
  'Atención: este cheque es de un pago de Cuentas por pagar; al anularlo también se anula ese pago y sus facturas vuelven a quedar con saldo pendiente.';

/** Lo que explica la ventana al blanquear un cheque. */
export const TEXTO_DE_BLANQUEO = (numero?: number): string =>
  `¿Blanquear el cheque No. ${numero ?? ''}? Se registró por error y nunca se imprimió ni se entregó: vuelve a estar disponible (su número se puede reutilizar) y su movimiento se elimina de verdad. Queda en la auditoría.`;
