import type {
  CambioDeMovimiento,
  CapaDelRecorrido,
  ConsumoDelRecorrido,
  SaldoDelArticulo,
} from '../../dominio/costeo/cambios-del-recorrido.js';
import type { MovimientoDelKardex } from '../../dominio/costeo/movimientos-del-kardex.js';
import type { CausaDeRecalculo } from '../../dominio/costeo/recalculo.js';
import type { TipoDeMovimientoGuardado } from '../../dominio/movimiento.js';

/** Un movimiento por guardar: el costo de una salida va provisional y el recálculo lo deja definitivo. */
export interface NuevoMovimiento {
  documentoId: string;
  articuloId: string;
  /** Nula solo en un movimiento de valor. */
  bodegaId: string | null;
  loteId: string | null;
  fecha: string;
  ordenDelDia: 0 | 1 | 2;
  tipo: TipoDeMovimientoGuardado;
  /** Con signo. */
  cantidad: bigint;
  cantidadEscrita: bigint | null;
  unidadEscritaId: string | null;
  costoUnitario: bigint;
  /** Con signo. */
  costoTotal: bigint;
  costoDelMetodo: boolean;
  /** La línea de la factura o nota del libro de donde viene. */
  lineaDeCompraId?: string | null;
  documentoDeCompraId?: string | null;
  /** La entrada que devuelve una devolución o que recibe la parte de una rebaja. */
  movimientoDeOrigenId?: string | null;
  /** Solo en un saldo inicial: el día de la compra real, que ordena su capa con PEPS. */
  fechaDeCapa?: string | null;
  /** Solo en un movimiento de valor de una rebaja: el almacén guarda su reparto con el movimiento. */
  reparto?: { base: string; parte: bigint } | null;
}

/** El rastro de un recálculo (§5.14). */
export interface NuevoRecalculo {
  articuloId: string;
  desdeFecha: string;
  documentoCausaId: string;
  causa: CausaDeRecalculo;
  salidasAfectadas: number;
  diferenciaDeCosto: bigint;
  /** Repartos (rebajas y costos adicionales) cuyo absorbido cambió (V-2). */
  repartosAfectados?: number;
  diferenciaAResultados?: bigint;
}

/**
 * El kardex del artículo y sus cachés (movimientos, capas, saldos y recálculos). La seguridad por empresa (RLS)
 * limita todo; los movimientos no llevan alcance por bodega, así que solo se leen unidos a su documento o aquí, para
 * el costeo, que necesita ver todas las bodegas.
 */
export interface AlmacenDelKardex {
  /**
   * Toma el candado compartido del cierre y el candado de cada artículo, en orden por id (R-5: dos documentos con los
   * mismos artículos no se esperan en círculo).
   */
  bloquear(articuloIds: readonly string[]): Promise<void>;
  /** Los vigentes del artículo con sus saldos, en cualquier orden (el motor los ordena). */
  movimientosVigentes(articuloId: string): Promise<MovimientoDelKardex[]>;
  /** Los movimientos de un documento, también los anulados. */
  movimientosDelDocumento(documentoId: string): Promise<MovimientoDelKardex[]>;
  /** Guarda y devuelve los movimientos con su `id` y su `secuencia`, en el mismo orden. */
  agregarMovimientos(nuevos: readonly NuevoMovimiento[]): Promise<MovimientoDelKardex[]>;
  /** Actualiza solo lo recalculado de las filas que cambiaron. */
  actualizarMovimientos(cambios: readonly CambioDeMovimiento[]): Promise<void>;
  /** Los movimientos del documento dejan de ser vigentes (anulación). */
  desactivarMovimientosDelDocumento(documentoId: string): Promise<void>;
  /** Un solo renglón deja de ser vigente (se corrigió o se quitó un saldo inicial). */
  desactivarMovimiento(movimientoId: string): Promise<void>;
  /** Con PEPS: borra y vuelve a crear las capas y consumos derivados del artículo. */
  reemplazarCapas(articuloId: string, derivado: DerivadoDePeps): Promise<void>;
  guardarSaldo(articuloId: string, saldo: SaldoDelArticulo): Promise<void>;
  agregarRecalculo(recalculo: NuevoRecalculo): Promise<void>;
}

export interface DerivadoDePeps {
  capas: readonly CapaDelRecorrido[];
  consumos: readonly ConsumoDelRecorrido[];
}
