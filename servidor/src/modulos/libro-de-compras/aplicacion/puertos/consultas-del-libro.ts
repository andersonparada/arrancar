import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { AnuladoDelLibro, DocumentoDelLibro } from '../../dominio/libro/documento-del-libro.js';

/** Las consultas del libro; corren en la transacción de la empresa activa (RLS). */
export interface ConsultasDelLibro {
  /**
   * Los documentos vigentes del período que se muestran en reportes SAT, con sus categorías de línea, ordenados por
   * emisión, tipo, serie y número.
   */
  documentosDelPeriodo(empresaId: string, periodo: string): Promise<DocumentoDelLibro[]>;
  /** Los anulados del período que se mostrarían en reportes SAT, por emisión, serie y número. */
  anuladosDelPeriodo(empresaId: string, periodo: string): Promise<AnuladoDelLibro[]>;
}

/** El nombre y el NIT de la empresa activa, que encabezan el libro. */
export interface IdentidadDeLaEmpresa {
  datos(operador: Operador): Promise<{ nombre: string; nit: string | null }>;
}
