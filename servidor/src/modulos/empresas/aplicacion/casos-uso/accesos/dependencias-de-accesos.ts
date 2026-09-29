import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { PermisosDeUsuario } from '../../../../core/identidad/aplicacion/puertos/contextos-vecinos.js';
import type { AsignacionesDeLocalidades } from '../../puertos/asignaciones-de-localidades.js';
import type { ConsultasLocalidades } from '../../puertos/consultas-localidades.js';

/** Lo que usan los casos de uso de la ventana de accesos a localidades. */
export interface DependenciasDeAccesos {
  unidadDeTrabajo: UnidadDeTrabajo;
  auditoria: Auditoria;
  consultas: ConsultasLocalidades;
  asignaciones: AsignacionesDeLocalidades;
  permisosDeUsuario: PermisosDeUsuario;
}
