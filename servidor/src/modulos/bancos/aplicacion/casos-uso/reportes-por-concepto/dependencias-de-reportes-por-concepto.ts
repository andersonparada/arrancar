import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { ConsultasDeTotalesPorConcepto } from '../../puertos/consultas-de-totales-por-concepto.js';

/** Lo que usan los dos reportes por concepto: solo lectura, así que basta la unidad de trabajo y las consultas. */
export interface DependenciasDeReportesPorConcepto {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeTotalesPorConcepto;
}
