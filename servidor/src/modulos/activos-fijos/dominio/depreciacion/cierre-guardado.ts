export type EstadoDeCierre = 'cerrado' | 'reabierto';

/** Un mes de depreciación tal como quedó guardado (§5.9), con el dinero en centavos. */
export interface CierreGuardado {
  periodo: string;
  estado: EstadoDeCierre;
  cerradoEn: Date;
  cerradoPor: string;
  reabiertoEn: Date | null;
  reabiertoPor: string | null;
  motivoDeReapertura: string | null;
  regimenIsr: string | null;
  totalContableCentavos: number;
  totalFiscalCentavos: number;
  activosDepreciados: number;
}
