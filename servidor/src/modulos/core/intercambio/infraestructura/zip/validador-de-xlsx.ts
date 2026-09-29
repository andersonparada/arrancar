import { ArchivoNoEsExcel, ExcelConContenidoNoPermitido } from '../../aplicacion/errores.js';
import { armarZipSinCompresion, type ParteDeZip } from './escritor-de-zip.js';
import { LectorDeZip, type EntradaDeZip } from './lector-de-zip.js';

const MAXIMO_DE_ENTRADAS = 100;
const TOPE_TOTAL_DESCOMPRIMIDO = 50 * 1024 * 1024;
const TOPE_POR_PARTE = 25 * 1024 * 1024;
const TIPOS_DE_CONTENIDO = '[Content_Types].xml';
const TIPO_DE_HOJA_NORMAL = 'spreadsheetml.sheet.main+xml';

const PARTES_PROHIBIDAS = [/(^|\/)vbaproject\.bin$/i, /(^|\/)embeddings\//i, /(^|\/)externallinks\//i];

/**
 * Revisa un `.xlsx` antes de dárselo a la librería de Excel: la firma del zip, la
 * cantidad de entradas, las partes peligrosas (macros, vínculos, incrustados) y el
 * tamaño real descomprimido, que se mide inflando con tope porque el declarado
 * puede mentir. Devuelve un zip nuevo solo con lo ya inflado y revisado.
 */
export class ValidadorDeXlsx {
  /**
   * @throws ArchivoNoEsExcel si no es un zip de Excel normal.
   * @throws ExcelConContenidoNoPermitido si trae macros, vínculos externos o incrustados.
   * @throws ExcelDemasiadoGrandeAlDescomprimir si el contenido inflado pasa del tope.
   */
  sanear(contenido: Buffer): Buffer {
    const lector = new LectorDeZip(contenido);
    const entradas = lector.listarEntradas(MAXIMO_DE_ENTRADAS);
    this.rechazarPartesProhibidas(entradas);
    const partes = this.descomprimirTodo(lector, entradas);
    this.exigirHojaNormal(partes);
    return armarZipSinCompresion(partes);
  }

  private rechazarPartesProhibidas(entradas: EntradaDeZip[]): void {
    const nombres = new Set<string>();
    for (const { nombre } of entradas) {
      if (nombres.has(nombre)) throw new ArchivoNoEsExcel();
      nombres.add(nombre);
      if (PARTES_PROHIBIDAS.some((patron) => patron.test(nombre))) throw new ExcelConContenidoNoPermitido();
    }
  }

  private descomprimirTodo(lector: LectorDeZip, entradas: EntradaDeZip[]): ParteDeZip[] {
    let restante = TOPE_TOTAL_DESCOMPRIMIDO;
    return entradas.map((entrada) => {
      const contenido = lector.descomprimir(entrada, Math.min(TOPE_POR_PARTE, restante));
      restante -= contenido.length;
      return { nombre: entrada.nombre, contenido };
    });
  }

  private exigirHojaNormal(partes: ParteDeZip[]): void {
    const tipos = partes.find((parte) => parte.nombre === TIPOS_DE_CONTENIDO);
    if (!tipos) throw new ArchivoNoEsExcel();
    const texto = tipos.contenido.toString('utf8').toLowerCase();
    if (texto.includes('macroenabled') || texto.includes('vbaproject')) throw new ExcelConContenidoNoPermitido();
    if (!texto.includes(TIPO_DE_HOJA_NORMAL)) throw new ArchivoNoEsExcel();
  }
}
