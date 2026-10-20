import type { ResumenDelLibro } from '../../dominio/libro/resumen-del-libro.js';
import type { LibroPaginado } from '../../dominio/libro/paginacion-del-libro.js';
import type { TipoDeLibro } from '../../dominio/libro/tipo-de-libro.js';

/** Todo lo que lleva el PDF del libro; las hojas ya vienen repartidas por el dominio. */
export interface DatosDelPdfDelLibro {
  empresa: { nombre: string; nit: string | null };
  periodo: string;
  tipoDeLibro: TipoDeLibro;
  libro: LibroPaginado;
  resumen: ResumenDelLibro;
  leyenda: ReadonlyArray<{ sigla: string; descripcion: string }>;
  /** El folio de la primera hoja; nulo en el borrador, que dice «BORRADOR — sin folio». */
  primerFolio: number | null;
}

/** Dibuja el PDF del libro; la aplicación no sabe con qué librería. */
export interface GeneradorDePdfDelLibro {
  generar(datos: DatosDelPdfDelLibro): Promise<Buffer>;
}
