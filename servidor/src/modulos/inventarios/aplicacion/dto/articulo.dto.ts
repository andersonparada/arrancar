import type { TipoDeInventario } from '../../dominio/tipos-de-inventario.js';

/** Artículo tal como lo ve el usuario en pantalla. */
export interface ArticuloDto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoriaId: string;
  tipoDeInventario: TipoDeInventario;
  unidadBaseId: string;
  manejaLotes: boolean;
  manejaVencimiento: boolean;
  codigoDeBarras: string | null;
  conceptoDeGastoId: string | null;
  existenciaMinima: string | null;
  pesoKgPorUnidadBase: string | null;
  activo: boolean;
  categoriaNombre: string | null;
  unidadBaseNombre: string | null;
  conceptoDeGastoNombre: string | null;
}

/** Lo que se recibe para registrar o cambiar un artículo, ya validado en su forma. */
export type SolicitudDeArticulo = Omit<
  ArticuloDto,
  'id' | 'categoriaNombre' | 'unidadBaseNombre' | 'conceptoDeGastoNombre'
>;
