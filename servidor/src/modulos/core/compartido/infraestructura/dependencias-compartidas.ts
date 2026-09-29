import { bd } from '../../base-datos/conexion.js';
import { busEventos } from '../../eventos/bus-eventos.js';
import type { DependenciasCompartidas } from '../aplicacion/dependencias-compartidas.js';
import { AuditoriaPostgres } from './auditoria-postgres.js';
import { CorrelativosPostgres } from './correlativos-postgres.js';
import { PoliticaDeReinicioAnualEnConfiguracion } from './politica-de-reinicio-anual.configuracion.js';
import { PoliticaDeZonaHorariaEnConfiguracion } from './politica-de-zona-horaria.configuracion.js';
import { PublicadorEventosEnBus } from './publicador-eventos-en-bus.js';
import { RelojEnZonaHoraria } from './reloj-en-zona-horaria.js';
import { UnidadDeTrabajoPostgres } from './unidad-de-trabajo-postgres.js';

let dependencias: DependenciasCompartidas | undefined;

/** Implementaciones reales de las dependencias compartidas; se crean una sola vez. */
export function dependenciasCompartidas(): DependenciasCompartidas {
  dependencias ??= {
    unidadDeTrabajo: new UnidadDeTrabajoPostgres(bd),
    publicadorEventos: new PublicadorEventosEnBus(busEventos),
    auditoria: new AuditoriaPostgres(),
    correlativos: new CorrelativosPostgres(new PoliticaDeReinicioAnualEnConfiguracion()),
    reloj: new RelojEnZonaHoraria(new PoliticaDeZonaHorariaEnConfiguracion()),
  };
  return dependencias;
}
