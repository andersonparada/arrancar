import { ArchivoDemasiadoGrande, DemasiadasFilas } from '../aplicacion/errores.js';
import { ArchivoConCeldasDemasiadoGrandes } from '../aplicacion/errores-de-lectura.js';
import type { LibroDeExcel } from '../aplicacion/puertos/libro-de-excel.js';
import type { ArchivoDeFilas, FilaCruda, LectorDeFilas } from '../aplicacion/puertos/lector-de-filas.js';
import { ubicarEncabezados } from '../aplicacion/ubicar-encabezados.js';
import { LibroDeExcelJs } from './libro-de-excel.exceljs.js';
import { detectarFormato } from './lectura/detectar-formato.js';
import {
  LectorDeCsv,
  MAXIMO_DE_CARACTERES_POR_CELDA,
  MAXIMO_DE_COLUMNAS,
  MAXIMO_DE_FILAS_CRUDAS,
} from './lectura/lector-de-csv.js';

export const MAXIMO_DEL_ARCHIVO_EN_MB = 5;

/** El CSV ya los vigila al leer; esto cubre también al xlsx. */
function validarTopes(filas: FilaCruda[]): void {
  if (filas.length > MAXIMO_DE_FILAS_CRUDAS) throw new DemasiadasFilas(MAXIMO_DE_FILAS_CRUDAS);
  for (const { celdas } of filas) {
    if (celdas.length > MAXIMO_DE_COLUMNAS) {
      throw new ArchivoConCeldasDemasiadoGrandes(`hay más de ${MAXIMO_DE_COLUMNAS} columnas`);
    }
    if (celdas.some((celda) => celda.length > MAXIMO_DE_CARACTERES_POR_CELDA)) {
      throw new ArchivoConCeldasDemasiadoGrandes(`una celda pasa de ${MAXIMO_DE_CARACTERES_POR_CELDA} caracteres`);
    }
  }
}

/** Lee `.xlsx` (validado con `ValidadorDeXlsx`) y CSV según su contenido, y ubica la fila de encabezados. */
export class LectorDeFilasDeArchivo implements LectorDeFilas {
  constructor(
    private readonly libro: LibroDeExcel = new LibroDeExcelJs(),
    private readonly csv = new LectorDeCsv(),
  ) {}

  async leerFilas(archivo: Buffer, encabezadosEsperados: readonly string[]): Promise<ArchivoDeFilas> {
    if (archivo.length > MAXIMO_DEL_ARCHIVO_EN_MB * 1024 * 1024) {
      throw new ArchivoDemasiadoGrande(MAXIMO_DEL_ARCHIVO_EN_MB);
    }
    const detectado = detectarFormato(archivo);
    const filas = detectado.formato === 'xlsx' ? await this.libro.leerFilas(archivo) : this.csv.leer(detectado.texto);
    validarTopes(filas);
    return { formato: detectado.formato, ...ubicarEncabezados(filas, encabezadosEsperados) };
  }
}
