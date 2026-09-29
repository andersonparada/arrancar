import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { EjecutorEnEmpresa } from '../../ejecutor-en-empresa.js';
import type { ConsultasDeDatosDeEmpresa } from '../../puertos/consultas-de-datos-de-empresa.js';
import type { RepositorioDeCargasIniciales } from '../../puertos/repositorio-de-cargas-iniciales.js';
import type { RepositorioDeDatosFiscales } from '../../puertos/repositorio-de-datos-fiscales.js';

/** Lo que necesitan los casos de uso de los datos fiscales y de la carga inicial de una empresa. */
export interface DependenciasDeDatosDeEmpresa {
  unidadDeTrabajo: UnidadDeTrabajo;
  ejecutorEnEmpresa: EjecutorEnEmpresa;
  repositorioFiscales: RepositorioDeDatosFiscales;
  repositorioCargas: RepositorioDeCargasIniciales;
  consultas: ConsultasDeDatosDeEmpresa;
  auditoria: Auditoria;
}
