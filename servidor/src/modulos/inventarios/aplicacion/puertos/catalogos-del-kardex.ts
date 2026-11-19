import type { ConversionDeArticulo } from '../../dominio/conversion.js';
import type { UnidadParaConvertir } from '../../dominio/conversion-a-base.js';
import type { TipoDeInventario } from '../../dominio/tipos-de-inventario.js';

/** Lo que un movimiento necesita saber de un artículo. */
export interface ArticuloParaMovimiento {
  id: string;
  codigo: string;
  nombre: string;
  tipoDeInventario: TipoDeInventario;
  unidadBaseId: string;
  manejaLotes: boolean;
  conceptoDeGastoId: string | null;
  activo: boolean;
}

export interface BodegaParaMovimiento {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface LoteParaMovimiento {
  id: string;
  articuloId: string;
}

/** Lo que los documentos consultan de los catálogos (artículos, unidades, lotes, bodegas y lo que apuntan). */
export interface CatalogosDelKardex {
  /** Solo los que existen en la empresa; el que falte lo detecta quien llama. */
  articulos(ids: readonly string[]): Promise<ArticuloParaMovimiento[]>;
  unidades(ids: readonly string[]): Promise<UnidadParaConvertir[]>;
  conversionesDe(articuloIds: readonly string[]): Promise<Map<string, ConversionDeArticulo[]>>;
  lotes(ids: readonly string[]): Promise<LoteParaMovimiento[]>;
  /** Nulo si no existe o el usuario no la ve. */
  bodega(id: string): Promise<BodegaParaMovimiento | null>;
  /** @throws RecursoNoEncontrado si algo de lo que se eligió no existe en la empresa. */
  exigirReferencias(referencias: ReferenciasDeSalida): Promise<void>;
}

export interface ReferenciasDeSalida {
  conceptoDeGastoId: string | null;
  localidadId: string | null;
  departamentoId: string | null;
}
