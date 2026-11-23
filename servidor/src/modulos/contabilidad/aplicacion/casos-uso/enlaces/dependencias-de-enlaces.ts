import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type {
  ConsultasEnlaces,
  LlavesDeEnlaceDeLosModulos,
  ModulosActivosDeLaCuentaActual,
  RepositorioEnlaces,
} from '../../puertos/enlaces.js';
import type { RepositorioCuentas } from '../../puertos/repositorio-cuentas.js';

/** Lo que usan los casos de uso de los enlaces. */
export interface DependenciasDeEnlaces {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioEnlaces;
  consultas: ConsultasEnlaces;
  cuentas: RepositorioCuentas;
  llaves: LlavesDeEnlaceDeLosModulos;
  modulosActivos: ModulosActivosDeLaCuentaActual;
  auditoria: Auditoria;
}
