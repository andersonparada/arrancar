import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { LectorDelMetodoInicial } from '../../puertos/entorno-del-kardex.js';
import type { RepositorioDeMetodos } from '../../puertos/repositorio-de-metodos.js';

/** Lo que usan los casos de uso de la política de costeo. */
export interface DependenciasDeMetodo {
  unidadDeTrabajo: UnidadDeTrabajo;
  auditoria: Auditoria;
  reloj: Reloj;
  metodos: RepositorioDeMetodos;
  metodoInicial: LectorDelMetodoInicial;
}
