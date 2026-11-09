import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import type { DatosDeSaldoInicial } from '../../dominio/saldo-inicial.js';

/** La fecha de inicio de la empresa y si su carga inicial ya se cerró (`null` si todavía no tiene fecha). */
export interface EstadoDeLaCarga {
  fechaDeInicio: string | null;
  cerrada: boolean;
}

/**
 * La carga inicial de la empresa activa, que vive en Empresas. Corre dentro de la transacción de quien pregunta y toma
 * un bloqueo compartido: nadie cierra la carga ni cambia la fecha hasta que ella termine.
 */
export interface CargaInicial {
  obtener(operador: Operador): Promise<EstadoDeLaCarga>;
}

/** Los proveedores de la cuenta que se leen para cargar un saldo inicial (lectura con seguridad por cuenta). */
export interface ProveedoresParaSaldos {
  /** Si el proveedor existe en la cuenta activa y está activo (como proveedor y como tercero). */
  estaDisponible(proveedorId: string): Promise<boolean>;
}

/** Un saldo inicial listo para guardar: el vencimiento ya es el definitivo (nulo solo en una nota de crédito). */
export type SaldoInicialAGuardar = DatosDeSaldoInicial;

/** Lo propio de los saldos iniciales: nacen y se corrigen ya completados, a nombre de quien los carga. */
export interface RepositorioDeSaldosIniciales {
  /** Lo guarda con `origen = 'saldo_inicial'` y estado `registrado`, registrado ahora por `registradoPor`. */
  agregar(saldo: SaldoInicialAGuardar, registradoPor: string): Promise<DocumentoPorPagar>;
  /** Reemplaza lo cargado y deja `registrado_en/por` en quien corrige. */
  reemplazar(id: string, saldo: SaldoInicialAGuardar, registradoPor: string): Promise<void>;
}
