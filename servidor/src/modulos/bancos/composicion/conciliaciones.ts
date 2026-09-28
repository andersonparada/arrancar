import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { AutorizarConciliacion } from '../aplicacion/casos-uso/conciliaciones/autorizar-conciliacion.js';
import { DevolverConciliacion } from '../aplicacion/casos-uso/conciliaciones/devolver-conciliacion.js';
import { EliminarConciliacion } from '../aplicacion/casos-uso/conciliaciones/eliminar-conciliacion.js';
import { IniciarConciliacion } from '../aplicacion/casos-uso/conciliaciones/iniciar-conciliacion.js';
import { ListarConciliaciones } from '../aplicacion/casos-uso/conciliaciones/listar-conciliaciones.js';
import { MarcarMovimientos } from '../aplicacion/casos-uso/conciliaciones/marcar-movimientos.js';
import { ObtenerConciliacion } from '../aplicacion/casos-uso/conciliaciones/obtener-conciliacion.js';
import { TerminarConciliacion } from '../aplicacion/casos-uso/conciliaciones/terminar-conciliacion.js';
import { ConciliacionesControlador } from '../http/conciliaciones.controlador.js';
import { rutasConciliaciones } from '../http/conciliaciones.rutas.js';
import { ConsultasConciliacionesDrizzle } from '../infraestructura/persistencia/consultas-conciliaciones.drizzle.js';
import { ConsultasMovimientosDrizzle } from '../infraestructura/persistencia/consultas-movimientos.drizzle.js';
import { RepositorioConciliacionesDrizzle } from '../infraestructura/persistencia/repositorio-conciliaciones.drizzle.js';

function dependenciasDeConciliaciones() {
  const { unidadDeTrabajo, auditoria } = dependenciasCompartidas();
  return {
    unidadDeTrabajo,
    auditoria,
    repositorio: new RepositorioConciliacionesDrizzle(),
    consultas: new ConsultasConciliacionesDrizzle(),
    consultasMovimientos: new ConsultasMovimientosDrizzle(),
  };
}

/** Raíz de composición de las conciliaciones: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeConciliaciones() {
  const dependencias = dependenciasDeConciliaciones();
  const casos = {
    listar: new ListarConciliaciones(dependencias),
    obtener: new ObtenerConciliacion(dependencias),
    iniciar: new IniciarConciliacion(dependencias),
    marcar: new MarcarMovimientos(dependencias),
    terminar: new TerminarConciliacion(dependencias),
    autorizar: new AutorizarConciliacion(dependencias),
    devolver: new DevolverConciliacion(dependencias),
    eliminar: new EliminarConciliacion(dependencias),
  };
  return rutasConciliaciones(new ConciliacionesControlador(casos));
}
