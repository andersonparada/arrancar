import type { Hallazgo } from '../../dominio/cierre/hallazgos-del-cierre.js';
import type { TipoDeInventario } from '../../dominio/tipos-de-inventario.js';

/** El valor de un mes del inventario por tipo de inventario (quetzales con dos decimales, como texto). */
export interface ValorPorTipoDto {
  tipoDeInventario: TipoDeInventario;
  valor: string;
}

/** Sin `costos.ver`, `valorTotal` va en `null` y `porTipo` vacío. */
export interface TotalesDelCierreDto {
  valorTotal: string | null;
  articulosConExistencia: number;
  porTipo: ValorPorTipoDto[];
}

/** Lo que se ve antes de cerrar un mes (§6.11), con la huella para saber si algo cambió entre revisar y cerrar. */
export interface RevisionDelCierreDto {
  periodo: string;
  hallazgos: Hallazgo[];
  /** Falso si algún hallazgo bloquea. */
  puedeCerrar: boolean;
  totales: TotalesDelCierreDto;
  metodo: string | null;
  regimenIsr: string | null;
  huella: string;
}

export interface CierreDto {
  periodo: string;
  estado: 'cerrado' | 'reabierto';
  cerradoEn: string;
  cerradoPor: string;
  reabiertoEn: string | null;
  reabiertoPor: string | null;
  motivoDeReapertura: string | null;
  metodo: string;
  regimenIsr: string | null;
  /** Nulo sin `costos.ver`. */
  valorTotal: string | null;
  /** Nulo para quien no ve todas las bodegas: es una cifra de toda la empresa. */
  articulosConExistencia: number | null;
}

/** El cierre completo con su valor por tipo: lo que queda en la auditoría al reabrir. */
export interface CierreConTiposDto extends Omit<CierreDto, 'valorTotal' | 'articulosConExistencia'> {
  valorTotal: string;
  articulosConExistencia: number;
  porTipo: ValorPorTipoDto[];
}

/** Los meses cerrados y cuál es el siguiente por cerrar (`null` si todavía no hay de dónde empezar). */
export interface EstadoDeCierresDto {
  siguienteMes: string | null;
  cierres: CierreDto[];
}

/** Un renglón de las existencias de un mes cerrado; sin `costos.ver`, costo y valor van en `null`. */
export interface ExistenciaAlCierreDto {
  articuloId: string;
  articuloCodigo: string;
  articuloNombre: string;
  bodegaId: string;
  bodegaNombre: string;
  tipoDeInventario: string;
  enTransitoInterno: boolean;
  cantidad: string;
  costoUnitario: string | null;
  valor: string | null;
}
