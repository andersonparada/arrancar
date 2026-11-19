import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { PermisosDeUsuario } from '../../../../core/identidad/aplicacion/puertos/contextos-vecinos.js';
import type { AsignacionesDeBodegas } from '../../puertos/asignaciones-de-bodegas.js';
import type { ConsultasBodegas } from '../../puertos/consultas-bodegas.js';

/** Lo que usan los casos de uso de la ventana de accesos a bodegas. */
export interface DependenciasDeAccesos {
  unidadDeTrabajo: UnidadDeTrabajo;
  auditoria: Auditoria;
  consultas: ConsultasBodegas;
  asignaciones: AsignacionesDeBodegas;
  permisosDeUsuario: PermisosDeUsuario;
}
