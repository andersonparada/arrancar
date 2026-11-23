import type { MetodoDeCosteo } from '../../dominio/costeo/tipos.js';
import type { TipoDeInventario } from '../../dominio/tipos-de-inventario.js';

/**
 * Un renglón de saldo inicial: lo que la empresa tenía de un artículo en una bodega y lote al día anterior a su fecha
 * de inicio. `id` es el del movimiento del kardex. `cantidad` y `unidadId` son los que se escribieron; la base va aparte.
 */
export interface SaldoInicialDto {
  id: string;
  documentoId: string;
  documentoNumero: number;
  articuloId: string;
  articuloCodigo: string;
  articuloNombre: string;
  tipoDeInventario: TipoDeInventario;
  bodegaId: string;
  bodegaCodigo: string;
  bodegaNombre: string;
  loteId: string | null;
  loteCodigo: string | null;
  loteVencimiento: string | null;
  /** Como se escribió (4 decimales), en `unidadId`; si no se escribió otra, es la cantidad base. */
  cantidad: string;
  unidadId: string;
  unidadNombre: string;
  cantidadBase: string;
  unidadBaseNombre: string;
  /** El costo total del renglón. */
  costoTotal: string;
  /** Por unidad base, con 6 decimales. */
  costoUnitario: string;
  /** El día de la compra real (con PEPS ordena la capa). */
  fechaDeCapa: string;
}

export interface TotalesDeSaldosIniciales {
  renglones: number;
  articulos: number;
  /** Σ de los costos de los renglones. */
  valor: string;
}

/** La pantalla «Saldos iniciales de inventario»: el estado de la carga, el método de costeo y los renglones. */
export interface SaldosInicialesDto {
  fechaDeInicio: string | null;
  /** El día anterior al inicio: la fecha de los documentos de saldo inicial. */
  fechaDelSaldo: string | null;
  cargaCerrada: boolean;
  /** `elegido` falso: hay que elegir el método antes del primer saldo (la pantalla lo pregunta). */
  metodo: { elegido: boolean; metodo: MetodoDeCosteo };
  totales: TotalesDeSaldosIniciales;
  saldos: SaldoInicialDto[];
}

/**
 * Lo que se escribe de un renglón. El lote se elige (`loteId`) o se escribe (`loteCodigo` con su vencimiento: se busca
 * entre los del artículo y, si no existe, se crea). Dinero y cantidades como texto.
 */
export interface SolicitudDeSaldoInicial {
  articuloId: string;
  bodegaId: string;
  loteId: string | null;
  loteCodigo: string | null;
  loteVencimiento: string | null;
  cantidad: string;
  unidadId: string | null;
  costoTotal: string;
  /** Sin ella, el día anterior al inicio. */
  fechaDeCapa: string | null;
}
