import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

export type TipoDeInventario =
  | 'mercaderia'
  | 'materia_prima'
  | 'suministros'
  | 'producto_en_proceso'
  | 'producto_terminado'
  | 'repuestos'
  | 'empaques';

/** Artículo tal como lo manda el servidor. */
export interface Articulo {
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

export type DatosArticulo = Omit<Articulo, 'id' | 'categoriaNombre' | 'unidadBaseNombre' | 'conceptoDeGastoNombre'>;

/** Cuántas unidades base trae una unidad de empaque del artículo («caja de 24»). */
export interface ConversionDeArticulo {
  unidadId: string;
  unidadNombre: string;
  factor: string;
  paraCompras: boolean;
}

export interface DatosDeConversiones {
  conversiones: { unidadId: string; factor: string; paraCompras: boolean }[];
}

export interface Lote {
  id: string;
  articuloId: string;
  codigo: string;
  fechaDeVencimiento: string | null;
  fechaDeFabricacion: string | null;
  observaciones: string | null;
}

export type DatosDeLote = Omit<Lote, 'id' | 'articuloId'>;

export interface ConceptoParaArticulo {
  id: string;
  nombre: string;
}

const RUTA = '/inventarios/articulos';

export class ApiArticulos {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<Articulo[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<Articulo>(`${RUTA}/${id}`);
  }

  crear(datos: DatosArticulo) {
    return this.http.crear<Articulo>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosArticulo) {
    return this.http.reemplazar<Articulo>(`${RUTA}/${id}`, datos);
  }

  /** Se lleva sus conversiones y lotes; queda en la auditoría. */
  eliminar(id: string) {
    return this.http.eliminar(`${RUTA}/${id}`);
  }

  /** El prefijo de la empresa y el siguiente correlativo libre. */
  codigoPropuesto() {
    return this.http.obtener<{ codigo: string }>(`${RUTA}/codigo-propuesto`);
  }

  /** Los conceptos de gasto del Libro de compras que el artículo puede proponer. */
  conceptosDeGasto() {
    return this.http.obtener<ConceptoParaArticulo[]>(`${RUTA}/conceptos-de-gasto`);
  }

  conversiones(id: string) {
    return this.http.obtener<ConversionDeArticulo[]>(`${RUTA}/${id}/conversiones`);
  }

  /** La lista reemplaza a la anterior. */
  reemplazarConversiones(id: string, datos: DatosDeConversiones) {
    return this.http.reemplazar<ConversionDeArticulo[]>(`${RUTA}/${id}/conversiones`, datos);
  }

  lotes(id: string) {
    return this.http.obtener<Lote[]>(`${RUTA}/${id}/lotes`);
  }

  crearLote(id: string, datos: DatosDeLote) {
    return this.http.crear<Lote>(`${RUTA}/${id}/lotes`, datos);
  }
}

export const apiArticulos = new ApiArticulos(clienteHttp);
