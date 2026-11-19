import type { ActivoParaCerrar } from '../../dominio/depreciacion/cierre-del-mes.js';
import type { DatosParaHallazgos } from '../../dominio/depreciacion/hallazgos-del-cierre.js';

/** Lo que la base sabe de los activos y que el cierre convierte en hallazgos. */
export type HallazgosDeActivos = Pick<
  DatosParaHallazgos,
  | 'enConstruccionAntiguos'
  | 'enUsoSinLocalidad'
  | 'edificiosSinValores'
  | 'conCostosDeDocumentosAnulados'
  | 'conSaldoInicial'
>;

/** La depreciación de un mes por clase de activo, en centavos. */
export interface TotalDeClase {
  claseId: string;
  clase: string;
  contableCentavos: number;
  fiscalCentavos: number;
}

/** Las lecturas del cierre mensual (§6.9). La seguridad por empresa (RLS) limita lo que se ve. */
export interface ConsultasDeCierre {
  /**
   * Los activos del balance que se deprecian en el mes, con sus tramos vigentes, lo ya depreciado de cada tramo y la
   * acumulada de cada libro antes del mes. Con `conBajasDelMes` incluye los dados de baja ese mes (primer mes
   * `mes_siguiente`, §3.6).
   */
  activosParaCerrar(periodo: string, conBajasDelMes: boolean): Promise<ActivoParaCerrar[]>;
  /** El primer mes que usa algún tramo vigente, o `null` si ningún activo se ha puesto en uso. */
  primerMesConTramos(): Promise<string | null>;
  hallazgosDeActivos(periodo: string, mesesDeConstruccion: number): Promise<HallazgosDeActivos>;
  /** El régimen de ISR de la empresa vigente en el mes (de Libro de compras), o `null` si no hay datos fiscales. */
  regimenIsr(periodo: string): Promise<string | null>;
  /** Las cuotas vigentes del mes agrupadas por clase. */
  totalesPorClase(periodo: string): Promise<TotalDeClase[]>;
}
