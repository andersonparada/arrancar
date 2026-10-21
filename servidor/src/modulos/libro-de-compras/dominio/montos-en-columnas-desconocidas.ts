/** `true` si el texto es un monto distinto de cero (`1,250.50`, `-12`, `Q 5.00`); un texto que no es número no cuenta. */
function esMontoDistintoDeCero(texto: string): boolean {
  const limpio = texto.replace(/[\s,]/g, '').replace(/^Q/i, '');
  return /^-?\d+(\.\d+)?$/.test(limpio) && /[1-9]/.test(limpio);
}

/**
 * Las columnas que el mapa de la SAT no conoce y que en esta fila traen un monto distinto de cero. Una fila con alguna no
 * se confirma en lote: el monto se perdería sin que nadie lo vea (decisión del contador, L4-c4).
 */
export function columnasDesconocidasConMonto(
  filaOriginal: Readonly<Record<string, string>>,
  encabezadosNoReconocidos: readonly string[],
): string[] {
  return encabezadosNoReconocidos.filter((encabezado) => esMontoDistintoDeCero(filaOriginal[encabezado] ?? ''));
}
