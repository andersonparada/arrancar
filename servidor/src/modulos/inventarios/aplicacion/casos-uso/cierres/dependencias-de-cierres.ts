import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { ConsultasDeCierre } from '../../puertos/consultas-de-cierre.js';
import type { ConsultasPorRecibir } from '../../puertos/consultas-por-recibir.js';
import type { CargaInicial, LectorDelMetodoInicial } from '../../puertos/entorno-del-kardex.js';
import type { PreguntasDelCierre } from '../../puertos/preguntas-del-cierre.js';
import type { RepositorioDeCierres } from '../../puertos/repositorio-de-cierres.js';
import type { RepositorioDeMetodos } from '../../puertos/repositorio-de-metodos.js';

/** Lo que usan los casos de uso del cierre mensual del inventario. */
export interface DependenciasDeCierres {
  unidadDeTrabajo: UnidadDeTrabajo;
  auditoria: Auditoria;
  reloj: Reloj;
  publicadorEventos: PublicadorEventos;
  cierres: RepositorioDeCierres;
  consultas: ConsultasDeCierre;
  bandeja: ConsultasPorRecibir;
  preguntas: PreguntasDelCierre;
  cargaInicial: CargaInicial;
  metodos: RepositorioDeMetodos;
  metodoInicial: LectorDelMetodoInicial;
}
