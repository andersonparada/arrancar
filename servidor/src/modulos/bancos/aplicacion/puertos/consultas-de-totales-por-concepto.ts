import type {
  FiltroDeTotalesPorConcepto,
  SaldosDelRango,
  TotalesDeUnConcepto,
} from '../dto/reportes-por-concepto.dto.js';

/** Lecturas agregadas para los reportes por concepto; se llaman dentro de la unidad de trabajo y no traen fila por fila. */
export interface ConsultasDeTotalesPorConcepto {
  /** @throws RecursoNoEncontrado si la cuenta no existe o no es de la empresa. */
  exigirCuenta(cuentaBancariaId: string): Promise<void>;
  /**
   * Una fila por concepto con movimientos vigentes (sin anular a la antigua) en el rango. El inverso se suma en el
   * concepto de su original.
   */
  totalesPorConcepto(filtro: FiltroDeTotalesPorConcepto): Promise<TotalesDeUnConcepto[]>;
  /** Saldos al inicio y al final del rango de las cuentas incluidas (`conceptoIds` no aplica). */
  saldosDelRango(filtro: FiltroDeTotalesPorConcepto): Promise<SaldosDelRango>;
}
