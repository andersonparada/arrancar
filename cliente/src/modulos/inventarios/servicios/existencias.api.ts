import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { TipoDeInventario } from './articulos.api';

/**
 * La cantidad de un artículo en una bodega y lote. Sin el permiso de costos, `costoUnitario` y `valor` llegan en
 * `null`: las pantallas no muestran dinero cuando falta.
 */
export interface Existencia {
  bodegaId: string;
  bodegaNombre: string;
  articuloId: string;
  articuloCodigo: string;
  articuloNombre: string;
  tipoDeInventario: TipoDeInventario;
  loteId: string | null;
  loteCodigo: string | null;
  cantidad: string;
  unidadBaseNombre: string;
  costoUnitario: string | null;
  valor: string | null;
}

export interface FiltrosDeExistencias {
  bodegaId?: string;
  categoriaId?: string;
  tipoDeInventario?: TipoDeInventario;
  articuloId?: string;
  incluirEnCero?: boolean;
}

/** Una línea del kardex de un artículo. */
export interface RenglonDeKardex {
  movimientoId: string;
  documentoId: string;
  clase: string;
  numeroDeDocumento: number;
  fecha: string;
  bodegaId: string | null;
  bodegaNombre: string | null;
  loteCodigo: string | null;
  tipo: string;
  entrada: string | null;
  salida: string | null;
  saldoCantidad: string;
  costoUnitario: string | null;
  costoTotal: string | null;
  saldoValor: string | null;
}

export interface FiltrosDeKardex {
  bodegaId?: string;
  desde?: string;
  hasta?: string;
}

export interface KardexDelArticulo {
  articuloId: string;
  articuloCodigo: string;
  articuloNombre: string;
  unidadBaseNombre: string;
  /** `null` cuando es el de todas las bodegas (solo para quien las ve todas). */
  bodegaId: string | null;
  renglones: RenglonDeKardex[];
}

const RUTA = '/inventarios';

export class ApiExistencias {
  constructor(private readonly http: ClienteHttp) {}

  listar(filtros: FiltrosDeExistencias = {}) {
    return this.http.obtener<Existencia[]>(`${RUTA}/existencias`, { ...filtros });
  }

  kardex(articuloId: string, filtros: FiltrosDeKardex = {}) {
    return this.http.obtener<KardexDelArticulo>(`${RUTA}/articulos/${articuloId}/kardex`, { ...filtros });
  }
}

export const apiExistencias = new ApiExistencias(clienteHttp);
