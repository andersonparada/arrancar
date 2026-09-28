import type { Conciliacion, ConciliacionId } from '../../dominio/conciliacion.js';

/** Resumen de la última conciliación de una cuenta, para revisar el orden de los meses. */
export interface ResumenDeLaUltimaConciliacion {
  id: string;
  anio: number;
  mes: number;
  cerrada: boolean;
}

export interface RepositorioConciliaciones {
  buscar(id: ConciliacionId): Promise<Conciliacion | null>;
  agregar(conciliacion: Conciliacion): Promise<void>;
  guardar(conciliacion: Conciliacion): Promise<void>;
  eliminar(id: ConciliacionId): Promise<void>;
  /** La más reciente (por año y mes) de la cuenta; `null` si no tiene ninguna. */
  ultimaDeLaCuenta(cuentaBancariaId: string): Promise<ResumenDeLaUltimaConciliacion | null>;
  /**
   * Reemplaza las marcas de la conciliación por `movimientoIds`: marca los que
   * llegan y suelta (`conciliacion_id = null`) los que ya no vienen.
   */
  guardarMarcas(conciliacionId: string, movimientoIds: string[]): Promise<void>;
}
