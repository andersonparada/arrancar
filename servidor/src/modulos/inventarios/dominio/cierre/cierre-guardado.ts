import type { MetodoDeCosteo } from '../costeo/tipos.js';

export type EstadoDeCierre = 'cerrado' | 'reabierto';

/** Un mes del inventario tal como quedó guardado (§5.19): el dinero en centavos enteros. */
export interface CierreGuardado {
  periodo: string;
  estado: EstadoDeCierre;
  cerradoEn: Date;
  cerradoPor: string;
  reabiertoEn: Date | null;
  reabiertoPor: string | null;
  motivoDeReapertura: string | null;
  metodo: MetodoDeCosteo;
  regimenIsr: string | null;
  valorTotal: bigint;
  articulosConExistencia: number;
}
