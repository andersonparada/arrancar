import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Activo } from '../../../dominio/activo.js';
import type { CargaInicial } from '../../puertos/carga-inicial.js';
import type { ConsultasActivos } from '../../puertos/consultas-activos.js';
import type { LectorDePrefijo } from '../../puertos/lector-de-prefijo.js';
import type { LectorDeUbicaciones } from '../../puertos/lector-de-ubicaciones.js';
import type { RepositorioActivos } from '../../puertos/repositorio-activos.js';
import type { RepositorioClases } from '../../puertos/repositorio-clases.js';

/** Lo que usan los casos de uso de los activos. */
export interface DependenciasDeActivos {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioActivos;
  consultas: ConsultasActivos;
  clases: RepositorioClases;
  auditoria: Auditoria;
  ubicaciones: LectorDeUbicaciones;
  cargaInicial: CargaInicial;
  correlativos: Correlativos;
  reloj: Reloj;
  prefijo: LectorDePrefijo;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function activoExistente(repositorio: RepositorioActivos, id: string): Promise<Activo> {
  const activo = await repositorio.buscar(Identificador.desde(id));
  if (!activo) throw new RecursoNoEncontrado('El activo');
  return activo;
}
