import type { TipoDeInventario } from '../../dominio/tipos-de-inventario.js';

/** La cantidad de un artículo en una bodega y lote. Sin `costos.ver`, `costoUnitario` y `valor` van en `null`. */
export interface ExistenciaDto {
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
  /** El costo unitario de la empresa para el artículo (el mismo en todas las bodegas). */
  costoUnitario: string | null;
  /** `cantidad × costoUnitario` de esta fila. */
  valor: string | null;
}

export interface FiltrosDeExistencias {
  bodegaId?: string;
  articuloId?: string;
  categoriaId?: string;
  tipoDeInventario?: TipoDeInventario;
  /** Por omisión solo las que tienen cantidad. */
  incluirEnCero?: boolean;
}

/** Una línea del kardex de un artículo (§13). Los saldos de la empresa solo salen con alcance total. */
export interface RenglonDeKardexDto {
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
  /** El saldo de la bodega elegida, o el de la empresa si no se eligió bodega. */
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

export interface KardexDelArticuloDto {
  articuloId: string;
  articuloCodigo: string;
  articuloNombre: string;
  unidadBaseNombre: string;
  /** `null` cuando es el de todas las bodegas. */
  bodegaId: string | null;
  renglones: RenglonDeKardexDto[];
}
