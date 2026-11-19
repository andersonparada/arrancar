import type { CierreGuardado } from '../../dominio/depreciacion/cierre-guardado.js';
import type { CuotaDelMes, TotalesDelCierre } from '../../dominio/depreciacion/cierre-del-mes.js';

/** Lo que se guarda al cerrar un mes: el cierre con sus totales y todas sus cuotas. */
export interface CierreNuevo {
  empresaId: string;
  periodo: string;
  cerradoPor: string;
  ahora: Date;
  regimenIsr: string | null;
  totales: TotalesDelCierre;
  cuotas: readonly CuotaDelMes[];
}

export interface Reapertura {
  periodo: string;
  usuarioId: string;
  ahora: Date;
  motivo: string;
}

/** Guarda y recupera los cierres mensuales y sus cuotas. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioCierres {
  buscar(periodo: string): Promise<CierreGuardado | null>;
  /** Todos los cierres, del más reciente al más antiguo. */
  listar(): Promise<CierreGuardado[]>;
  /** Crea el cierre del mes (o vuelve a cerrar uno reabierto) con sus cuotas vigentes. */
  guardar(cierre: CierreNuevo): Promise<void>;
  /** Pone el cierre en `reabierto` y deja sus cuotas como no vigentes; no borra nada. */
  reabrir(reapertura: Reapertura): Promise<void>;
}
