import { ArchivoNoEsExcel } from '../../aplicacion/errores.js';
import { ArchivoDeTextoNoAdmitido, ExcelAntiguoNoAdmitido } from '../../aplicacion/errores-de-lectura.js';

export type FormatoDetectado = { formato: 'xlsx' } | { formato: 'csv'; texto: string };

const FIRMA_DE_ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const FIRMA_DE_BIFF = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const BOM_DE_UTF8 = Buffer.from([0xef, 0xbb, 0xbf]);
const BYTES_A_REVISAR = 8 * 1024;
/** Un CSV nunca empieza con `<`: es HTML, XML o un portal que disfraza su página de Excel. */
const INICIO_DE_MARCADO = '<';

const empiezaCon = (contenido: Buffer, firma: Buffer) => contenido.subarray(0, firma.length).equals(firma);

/** UTF-8 si es válido; si no, Windows-1252 (Latin-1), como guarda Excel en español. */
function decodificar(contenido: Buffer): string {
  const sinBom = empiezaCon(contenido, BOM_DE_UTF8) ? contenido.subarray(BOM_DE_UTF8.length) : contenido;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(sinBom);
  } catch {
    return new TextDecoder('windows-1252').decode(sinBom);
  }
}

/**
 * Detecta el formato por los primeros bytes, nunca por la extensión.
 * @throws ExcelAntiguoNoAdmitido con un .xls (BIFF).
 * @throws ArchivoDeTextoNoAdmitido con HTML o XML disfrazados.
 * @throws ArchivoNoEsExcel con binarios, UTF-16 o archivos vacíos.
 */
export function detectarFormato(contenido: Buffer): FormatoDetectado {
  if (empiezaCon(contenido, FIRMA_DE_ZIP)) return { formato: 'xlsx' };
  if (empiezaCon(contenido, FIRMA_DE_BIFF)) throw new ExcelAntiguoNoAdmitido();
  if (contenido.length === 0 || contenido.subarray(0, BYTES_A_REVISAR).includes(0)) throw new ArchivoNoEsExcel();
  const texto = decodificar(contenido);
  if (texto.trimStart().startsWith(INICIO_DE_MARCADO)) throw new ArchivoDeTextoNoAdmitido();
  return { formato: 'csv', texto };
}
