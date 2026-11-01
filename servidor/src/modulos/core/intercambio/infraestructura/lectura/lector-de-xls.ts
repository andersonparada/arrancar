import { ArchivoNoLegible } from '../../aplicacion/errores.js';
import type { FilaCruda } from '../../aplicacion/puertos/lector-de-filas.js';
import { ErrorEsperado } from '../../../compartido/dominio/errores.js';
import { leerHojaDeBiff8 } from './xls/lector-de-biff8.js';
import { extraerLibroDeCfb } from './xls/lector-de-cfb.js';

/**
 * Lee la primera hoja de un `.xls` (Excel 97-2003: libro BIFF8 dentro de un contenedor OLE2) sin librerías:
 * no ejecuta nada, no evalúa fórmulas y revisa cada estructura antes de seguirla. Ver `docs/modulos/evaluacion-lectura-xls.md`.
 * Lo que no es un error esperado (un índice fuera de rango, un buffer corto) se informa como archivo no legible,
 * sin traza.
 * @throws ArchivoNoLegible, ExcelConContenidoNoPermitido, ExcelCifrado, ExcelAntiguoNoAdmitido, DemasiadasFilas o
 * ArchivoConCeldasDemasiadoGrandes.
 */
export class LectorDeXls {
  leer(archivo: Buffer): FilaCruda[] {
    try {
      return leerHojaDeBiff8(extraerLibroDeCfb(archivo));
    } catch (error) {
      if (error instanceof ErrorEsperado) throw error;
      throw new ArchivoNoLegible();
    }
  }
}
