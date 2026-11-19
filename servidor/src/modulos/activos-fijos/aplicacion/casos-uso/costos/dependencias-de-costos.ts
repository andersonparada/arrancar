import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { ConsultasCostos } from '../../puertos/consultas-costos.js';
import type { LineasDelLibro } from '../../puertos/lineas-del-libro.js';
import type { RepositorioCostos } from '../../puertos/repositorio-costos.js';
import type { DependenciasDeActivos } from '../activos/dependencias-de-activos.js';

/** Lo que usan los casos de uso de los costos: lo de los activos más sus costos, las líneas del libro y los eventos. */
export interface DependenciasDeCostos extends Pick<
  DependenciasDeActivos,
  | 'unidadDeTrabajo'
  | 'repositorio'
  | 'clases'
  | 'auditoria'
  | 'ubicaciones'
  | 'cargaInicial'
  | 'correlativos'
  | 'prefijo'
  | 'reloj'
> {
  costos: RepositorioCostos;
  consultasDeCostos: ConsultasCostos;
  lineas: LineasDelLibro;
  publicadorEventos: PublicadorEventos;
}

/** Los dos primeros caracteres del mes de una fecha `aaaa-mm-dd`: el período, siempre el primer día. */
export const periodoDe = (fecha: string): string => `${fecha.slice(0, 7)}-01`;
