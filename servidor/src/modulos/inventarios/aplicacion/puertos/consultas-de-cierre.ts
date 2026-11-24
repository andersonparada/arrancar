import type { ArticuloAlCorte } from '../../dominio/cierre/existencias-del-cierre.js';
import type { DatosParaHallazgos } from '../../dominio/cierre/hallazgos-del-cierre.js';

/** Lo que la base sabe del inventario y que el cierre convierte en hallazgos. */
export type HallazgosDeLaBase = Pick<
  DatosParaHallazgos,
  'conSaldosIniciales' | 'recepcionesDeDocumentosAnulados' | 'trasladosEnTransito' | 'lotesVencidos'
>;

/**
 * Las lecturas del cierre mensual (§6.11). Leen **toda** la empresa, sin el alcance por bodega: por eso solo las usan
 * los casos de uso que ya comprobaron que quien cierra ve todas las bodegas.
 */
export interface ConsultasDeCierre {
  /**
   * Lo que había de cada artículo con existencia al final de `fin` (`aaaa-mm-dd`): cantidad y valor según su último
   * movimiento vigente, lo que había en cada bodega y lo que iba en tránsito entre bodegas.
   */
  existenciasAl(fin: string): Promise<ArticuloAlCorte[]>;
  /** El primer mes con movimientos vigentes, o `null` si no hay ninguno. */
  primerMesConMovimientos(): Promise<string | null>;
  hallazgosDeLaBase(periodo: string): Promise<HallazgosDeLaBase>;
  /** El régimen de ISR de la empresa vigente en el mes (de Libro de compras), o `null` si no hay datos fiscales. */
  regimenIsr(periodo: string): Promise<string | null>;
}
