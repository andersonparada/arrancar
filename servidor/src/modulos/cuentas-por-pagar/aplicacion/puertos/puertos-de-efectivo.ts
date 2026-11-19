import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type {
  CargoPorBancarizar,
  EvaluacionDeBancarizacion,
} from '../../../core/contratos/libro-de-compras.contratos.js';

/**
 * El bloqueo que evita que dos operaciones a la vez pasen las dos bajo el umbral de bancarización al mismo proveedor: se toma
 * por proveedor y dura lo que la transacción. La clave es la del libro (`libro-de-compras.bancarizacion:<empresa>:<proveedor>`),
 * la misma que toma su orden `evaluar_bancarizacion`, para que todos los módulos que pagan en efectivo esperen el mismo turno.
 */
export interface BloqueoDeBancarizacion {
  /** Bloquea a los proveedores en orden de id; con otra operación que ya los tenga, espera a que termine. */
  bloquear(proveedorIds: readonly string[]): Promise<void>;
}

/** Lo que se le pide al libro para evaluar un pago en efectivo. */
export interface PedidoDeEvaluacion {
  proveedorId: string;
  proveedorNombre: string;
  /** `AAAA-MM-DD`: la fecha del pago, que fija el mes. */
  fecha: string;
  montoEnEfectivoCentavos: number;
  cargos: CargoPorBancarizar[];
}

/** Evaluar la bancarización la hace el libro (orden `libro-de-compras.evaluar_bancarizacion`), con lo pagado por todos los módulos. */
export interface BancarizacionDelLibro {
  evaluar(operador: Operador, pedido: PedidoDeEvaluacion): Promise<EvaluacionDeBancarizacion>;
}
