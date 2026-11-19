import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { ConsultasCheques } from '../../puertos/consultas-cheques.js';
import type { LugarDeEmision } from '../../puertos/lugar-de-emision.js';
import type {
  ConsultasDeImpresionDeCheques,
  DatosDeLaEmpresaParaCheques,
  DetallesDelOrigen,
  RepositorioDeImpresionesDeCheques,
} from '../../puertos/impresion-de-cheques.js';
import type { RepositorioCheques } from '../../puertos/repositorio-cheques.js';
import type { RepositorioFormatosDeCheque } from '../../puertos/repositorio-formatos-de-cheque.js';

/** Lo que usan los casos de uso de imprimir cheques y su comprobante de egreso. */
export interface DependenciasDeImpresionDeCheques {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioCheques;
  consultasDeCheques: ConsultasCheques;
  consultas: ConsultasDeImpresionDeCheques;
  impresiones: RepositorioDeImpresionesDeCheques;
  formatos: RepositorioFormatosDeCheque;
  lugarDeEmision: LugarDeEmision;
  empresa: DatosDeLaEmpresaParaCheques;
  origen: DetallesDelOrigen;
  auditoria: Auditoria;
}
