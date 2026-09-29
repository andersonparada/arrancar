import type { FiltroDeIntereses, InteresDelReporteDto } from '../dto/intereses.dto.js';

/** Lecturas del reporte de intereses; se llaman dentro de la unidad de trabajo. */
export interface ConsultasDeIntereses {
  /** @throws RecursoNoEncontrado si la cuenta no existe o no es de la empresa. */
  exigirCuenta(cuentaBancariaId: string): Promise<void>;
  /**
   * Las notas de crédito con interés bruto e ISR del rango, vigentes: no las revertidas (su inverso, un débito, no
   * copia los datos), de la más antigua a la más reciente.
   */
  listar(filtro: FiltroDeIntereses): Promise<InteresDelReporteDto[]>;
  /** Cuántas notas vigentes de un concepto que pide datos de intereses no los tienen. */
  contarSinDatos(filtro: FiltroDeIntereses): Promise<number>;
}
