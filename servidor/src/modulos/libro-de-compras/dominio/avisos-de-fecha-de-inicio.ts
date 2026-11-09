const aDdMmAaaa = (fecha: string): string => `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(0, 4)}`;

/**
 * Aviso que no bloquea: una factura emitida antes de la fecha de inicio de la empresa pudo ya estar en el libro de
 * compras del sistema anterior, y registrarla otra vez duplicaría su crédito fiscal. Sin fecha de inicio no hay aviso.
 */
export function avisosDeFechaDeInicio(pedido: { fechaDeEmision: string; fechaDeInicio: string | null }): string[] {
  const { fechaDeEmision, fechaDeInicio } = pedido;
  if (!fechaDeInicio || fechaDeEmision >= fechaDeInicio) return [];
  return [
    `Esta factura es de antes de la fecha de inicio (${aDdMmAaaa(fechaDeInicio)}). Regístrela solo si no estaba en el libro de compras del sistema anterior.`,
  ];
}
