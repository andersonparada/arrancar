import type { Auditoria } from '../../../../../core/compartido/aplicacion/auditoria.js';
import type { UnidadDeTrabajo } from '../../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type {
  AvisosDeValorDeInmueble,
  ConsultasValoresDeInmueble,
  RepositorioValoresDeInmueble,
} from '../../../puertos/valores-de-inmueble.js';
import type { RepositorioInmuebles } from '../../../puertos/repositorio-inmuebles.js';

/** Lo que usan los casos de uso de los valores del inmueble. */
export interface DependenciasDeValores {
  unidadDeTrabajo: UnidadDeTrabajo;
  inmuebles: RepositorioInmuebles;
  repositorio: RepositorioValoresDeInmueble;
  consultas: ConsultasValoresDeInmueble;
  avisos: AvisosDeValorDeInmueble;
  auditoria: Auditoria;
}
