import { bd } from '../../base-datos/conexion.js';
import { busEventos } from '../../eventos/bus-eventos.js';
import type { DependenciasCompartidas } from '../aplicacion/dependencias-compartidas.js';
import { PublicadorEventosEnBus } from './publicador-eventos-en-bus.js';
import { UnidadDeTrabajoPostgres } from './unidad-de-trabajo-postgres.js';

let dependencias: DependenciasCompartidas | undefined;

/** Implementaciones reales de las dependencias compartidas; se crean una sola vez. */
export function dependenciasCompartidas(): DependenciasCompartidas {
  dependencias ??= {
    unidadDeTrabajo: new UnidadDeTrabajoPostgres(bd),
    publicadorEventos: new PublicadorEventosEnBus(busEventos),
  };
  return dependencias;
}
