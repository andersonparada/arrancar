import type { SaldoInicialDto } from '../dto/saldo-inicial.dto.js';
import type { TipoDeInventario } from '../../dominio/tipos-de-inventario.js';

/** Lo que hay de un artículo en una bodega por los saldos iniciales: cantidad en diezmilésimas y valor en centavos. */
export interface ExistenciaDeSaldoInicial {
  articuloId: string;
  articuloCodigo: string;
  tipoDeInventario: TipoDeInventario;
  bodegaId: string;
  bodegaNombre: string;
  cantidad: bigint;
  valor: bigint;
}

/** Lo que la revisión del cierre de la carga necesita: de **toda** la empresa, vea o no el usuario todas las bodegas. */
export interface ResumenDeSaldosIniciales {
  existencias: ExistenciaDeSaldoInicial[];
  /** Lotes con existencia cuyo vencimiento es anterior a la fecha de inicio, y lo que valen. */
  lotesVencidos: { lotes: number; valor: bigint };
}

/** Lo que impide cambiar la fecha de inicio (§8). */
export interface ConflictosConLaFechaDeInicio {
  /** Movimientos vigentes que no son de saldo inicial con fecha anterior a la nueva. */
  movimientosAnteriores: number;
  /** Saldos iniciales con la fecha de su capa igual o posterior a la nueva. */
  capasPosteriores: number;
}

/** Lecturas de los saldos iniciales para pantallas, la revisión del cierre y el aviso de la fecha de inicio. */
export interface ConsultasDeSaldosIniciales {
  /** Los renglones vigentes de las bodegas que el usuario ve, por artículo y bodega. */
  listar(): Promise<SaldoInicialDto[]>;
  /** Nulo si no es un renglón vigente de saldo inicial o el usuario no ve su bodega. */
  obtener(movimientoId: string): Promise<SaldoInicialDto | null>;
  /** Sin el alcance por bodega: la revisión es de toda la empresa. */
  resumenParaLaRevision(fechaDeInicio: string): Promise<ResumenDeSaldosIniciales>;
  /** Si hay algún conteo físico que respalde el saldo inicial (los conteos llegan con INV-9: hoy, ninguno). */
  hayConteos(): Promise<boolean>;
  conflictosConLaFechaDeInicio(nueva: string): Promise<ConflictosConLaFechaDeInicio>;
  /** Mueve los documentos y movimientos de saldo inicial al día anterior a la nueva fecha de inicio, de toda la empresa. */
  reubicar(nuevaFechaDeInicio: string): Promise<void>;
}
