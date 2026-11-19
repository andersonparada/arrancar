import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type {
  EfectoFiscalDeBancarizacion,
  PagadoAlProveedorEnElMes,
} from '../../../core/contratos/libro-de-compras.contratos.js';

/**
 * El turno por empresa y proveedor para evaluar la bancarización: dura lo que la transacción, así que otra operación
 * (de cualquier módulo) que pague en efectivo al mismo proveedor espera y, al entrar, ya ve lo que esta dejó.
 */
export interface BloqueoDeBancarizacion {
  bloquear(proveedorId: string): Promise<void>;
}

/** El umbral de bancarización de la instalación, en centavos. */
export interface UmbralDeBancarizacion {
  centavos(operador: Operador): Promise<number>;
}

/** Lo que dicen los módulos de pagos (por el mediador) de lo pagado a un proveedor en un mes. */
export interface PagadoAlProveedor {
  /** Una respuesta por cada módulo activo que tiene algo que decir. */
  delMes(operador: Operador, proveedorId: string, mes: string): Promise<PagadoAlProveedorEnElMes[]>;
}

/** Qué perdería la empresa, por documento del libro, si un pago en efectivo no se bancariza. */
export interface EfectosFiscalesDeDocumentos {
  /** Sin entrada para el documento que no existe o cuyo período no tiene datos fiscales de la empresa. */
  de(documentoIds: readonly string[]): Promise<Map<string, EfectoFiscalDeBancarizacion>>;
}
