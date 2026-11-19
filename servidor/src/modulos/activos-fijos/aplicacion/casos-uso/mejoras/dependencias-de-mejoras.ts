import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { Cierres } from '../../puertos/cierres.js';
import type { ConsultasActivos } from '../../puertos/consultas-activos.js';
import type { ConsultasMejoras } from '../../puertos/consultas-mejoras.js';
import type { LectorDeHistorialDeDepreciacion } from '../../puertos/historial-de-depreciacion.js';
import type { LectorDePrimerMes } from '../../puertos/lector-de-primer-mes.js';
import type { LineasDelLibro } from '../../puertos/lineas-del-libro.js';
import type { RepositorioActivos } from '../../puertos/repositorio-activos.js';
import type { RepositorioClases } from '../../puertos/repositorio-clases.js';
import type { RepositorioCostos } from '../../puertos/repositorio-costos.js';
import type { RepositorioMejoras } from '../../puertos/repositorio-mejoras.js';
import type { RepositorioSaldosIniciales } from '../../puertos/repositorio-saldos-iniciales.js';
import type { RepositorioTramos } from '../../puertos/repositorio-tramos.js';

/** Lo que usan los casos de uso que cambian la depreciación de un activo en uso hacia adelante (§6.5 y §6.6). */
export interface DependenciasDeCambioDeLibros {
  unidadDeTrabajo: UnidadDeTrabajo;
  auditoria: Auditoria;
  reloj: Reloj;
  publicadorEventos: PublicadorEventos;
  repositorio: RepositorioActivos;
  /** La ficha del activo, con sus tramos: lo que queda en la auditoría como estaba. */
  consultas: ConsultasActivos;
  clases: RepositorioClases;
  costos: RepositorioCostos;
  tramos: RepositorioTramos;
  historial: LectorDeHistorialDeDepreciacion;
  saldos: Pick<RepositorioSaldosIniciales, 'fiscalDeActivo'>;
  cierres: Cierres;
  primerMes: LectorDePrimerMes;
}

/** Lo que usan registrar y anular una mejora o un costo posterior. */
export interface DependenciasDeMejoras extends DependenciasDeCambioDeLibros {
  mejoras: RepositorioMejoras;
  consultasDeMejoras: ConsultasMejoras;
  correlativos: Correlativos;
  lineas: LineasDelLibro;
}
