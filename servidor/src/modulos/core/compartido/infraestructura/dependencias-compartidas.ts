import { bd } from '../../base-datos/conexion.js';
import { busEventos } from '../../eventos/bus-eventos.js';
import type { DependenciasCompartidas } from '../aplicacion/dependencias-compartidas.js';
import { crearDocumentosProtegidos } from '../../archivos/infraestructura/documentos-protegidos.js';
import { VerificadorDeFotosDrizzle } from '../../archivos/infraestructura/verificador-de-fotos.drizzle.js';
import { mediador } from '../../mediador/contexto.js';
import { crearBandejaDeSalida } from '../../correo/bandeja.js';
import { AuditoriaPostgres } from './auditoria-postgres.js';
import { CorrelativosPostgres } from './correlativos-postgres.js';
import { PoliticaDeReinicioAnualEnConfiguracion } from './politica-de-reinicio-anual.configuracion.js';
import { PoliticaDeZonaHorariaEnConfiguracion } from './politica-de-zona-horaria.configuracion.js';
import { AvisadorDeEventosEnMediador } from './avisador-de-eventos-en-mediador.js';
import { PublicadorDeEventos } from './publicador-de-eventos.js';
import { PublicadorEventosEnBus } from './publicador-eventos-en-bus.js';
import { RelojEnZonaHoraria } from './reloj-en-zona-horaria.js';
import { UnidadDeTrabajoPostgres } from './unidad-de-trabajo-postgres.js';

let dependencias: DependenciasCompartidas | undefined;

function crearDependencias(): DependenciasCompartidas {
  const documentos = crearDocumentosProtegidos();
  const unidadDeTrabajo = new UnidadDeTrabajoPostgres(bd);
  const auditoria = new AuditoriaPostgres();
  const publicadorEnBus = new PublicadorEventosEnBus(busEventos);
  return {
    unidadDeTrabajo,
    publicadorEventos: publicadorEnBus,
    publicadorDeEventos: new PublicadorDeEventos(publicadorEnBus, new AvisadorDeEventosEnMediador(mediador)),
    auditoria,
    correlativos: new CorrelativosPostgres(new PoliticaDeReinicioAnualEnConfiguracion()),
    reloj: new RelojEnZonaHoraria(new PoliticaDeZonaHorariaEnConfiguracion()),
    fotos: new VerificadorDeFotosDrizzle(),
    documentos,
    bandeja: crearBandejaDeSalida({ documentos, unidadDeTrabajo, auditoria }),
  };
}

/** Implementaciones reales de las dependencias compartidas; se crean una sola vez. */
export function dependenciasCompartidas(): DependenciasCompartidas {
  dependencias ??= crearDependencias();
  return dependencias;
}
