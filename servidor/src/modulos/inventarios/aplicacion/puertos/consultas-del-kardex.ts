import type { DocumentoDto, FiltrosDeDocumentos } from '../dto/documento.dto.js';
import type { ExistenciaDto, FiltrosDeExistencias } from '../dto/existencia.dto.js';

/** Una línea del kardex tal como se lee, en enteros (la cantidad y el costo con signo). */
export interface FilaDeKardex {
  movimientoId: string;
  documentoId: string;
  clase: string;
  numeroDeDocumento: number;
  fecha: string;
  bodegaId: string | null;
  bodegaNombre: string | null;
  loteCodigo: string | null;
  tipo: string;
  /** Diezmilésimas con signo. */
  cantidad: bigint;
  costoUnitario: bigint;
  costoTotal: bigint;
  /** Los de la empresa: solo se muestran a quien ve todas las bodegas. */
  saldoCantidad: bigint;
  saldoValor: bigint;
}

export interface ArticuloDeKardex {
  id: string;
  codigo: string;
  nombre: string;
  unidadBaseNombre: string;
}

/**
 * Lecturas para pantallas. Los movimientos se leen **siempre unidos a su documento** (R-3): así la seguridad por
 * bodega de los documentos también protege el kardex. Los dineros van completos: quien llama decide si los muestra.
 */
export interface ConsultasDelKardex {
  documentos(filtros: FiltrosDeDocumentos): Promise<DocumentoDto[]>;
  /** @throws RecursoNoEncontrado si no existe o el usuario no ve su bodega. */
  documento(id: string): Promise<DocumentoDto>;
  existencias(filtros: FiltrosDeExistencias): Promise<ExistenciaDto[]>;
  /** @throws RecursoNoEncontrado si el artículo no existe. */
  articulo(id: string): Promise<ArticuloDeKardex>;
  /** Los movimientos vigentes del artículo (de una bodega si se indica) en el orden del kardex (§7.2). */
  filasDeKardex(articuloId: string, bodegaId: string | null): Promise<FilaDeKardex[]>;
}
