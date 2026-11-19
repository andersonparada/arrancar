import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { CargaInicial } from '../../puertos/carga-inicial.js';
import type { Cierres } from '../../puertos/cierres.js';
import type { ConsultasBandeja } from '../../puertos/consultas-bandeja.js';
import type { ConsultasDeCierre } from '../../puertos/consultas-de-cierre.js';
import type { LectorDeMesesDeConstruccion } from '../../puertos/lector-de-meses-de-construccion.js';
import type { LectorDePrimerMes } from '../../puertos/lector-de-primer-mes.js';
import type { RepositorioCierres } from '../../puertos/repositorio-cierres.js';

/** Lo que usan los casos de uso del cierre mensual de depreciación. */
export interface DependenciasDeCierre {
  unidadDeTrabajo: UnidadDeTrabajo;
  auditoria: Auditoria;
  reloj: Reloj;
  publicadorEventos: PublicadorEventos;
  cierres: Cierres;
  repositorioCierres: RepositorioCierres;
  consultas: ConsultasDeCierre;
  bandeja: ConsultasBandeja;
  cargaInicial: CargaInicial;
  primerMes: LectorDePrimerMes;
  mesesDeConstruccion: LectorDeMesesDeConstruccion;
}
