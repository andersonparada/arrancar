/** `true` si el texto es un monto distinto de cero (`1,250.50`, `-12`, `Q 5.00`); un texto que no es número no cuenta. */
function esMontoDistintoDeCero(texto: string): boolean {
  const limpio = texto.replace(/[\s,]/g, '').replace(/^Q/i, '');
  return /^-?\d+(\.\d+)?$/.test(limpio) && /[1-9]/.test(limpio);
}

/**
 * Columnas del archivo real de la SAT que el mapa no lee pero que nunca traen un monto: códigos, NIT y nombres. Sus valores
 * numéricos (el código de establecimiento, el NIT del certificador) no son dinero y no deben bloquear la confirmación.
 */
const COLUMNAS_SIN_MONTO: ReadonlySet<string> = new Set(
  [
    'Clasificación emisor',
    'Exportación',
    'Ubicación temporal',
    'Código de establecimiento',
    'Nombre del establecimiento',
    'Nombre completo del receptor',
    'NIT del Certificador',
    'Nombre completo del Certificador',
  ].map(sinTildesNiMayusculas),
);

function sinTildesNiMayusculas(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Las columnas que el mapa de la SAT no conoce y que en esta fila traen un monto distinto de cero. Una fila con alguna no
 * se confirma en lote: el monto se perdería sin que nadie lo vea (decisión del contador, L4-c4). Las columnas que se sabe
 * que no son de dinero (`COLUMNAS_SIN_MONTO`) no cuentan.
 */
export function columnasDesconocidasConMonto(
  filaOriginal: Readonly<Record<string, string>>,
  encabezadosNoReconocidos: readonly string[],
): string[] {
  return encabezadosNoReconocidos.filter(
    (encabezado) =>
      !COLUMNAS_SIN_MONTO.has(sinTildesNiMayusculas(encabezado)) &&
      esMontoDistintoDeCero(filaOriginal[encabezado] ?? ''),
  );
}
