import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { AbrirEstadoDeCuenta } from '../aplicacion/casos-uso/conciliaciones/abrir-estado-de-cuenta.js';
import { AutorizarConciliacion } from '../aplicacion/casos-uso/conciliaciones/autorizar-conciliacion.js';
import { DesmarcarNotaEnConciliacion } from '../aplicacion/casos-uso/conciliaciones/desmarcar-nota-en-conciliacion.js';
import { DevolverConciliacion } from '../aplicacion/casos-uso/conciliaciones/devolver-conciliacion.js';
import { EliminarConciliacion } from '../aplicacion/casos-uso/conciliaciones/eliminar-conciliacion.js';
import { IniciarConciliacion } from '../aplicacion/casos-uso/conciliaciones/iniciar-conciliacion.js';
import { ListarConciliaciones } from '../aplicacion/casos-uso/conciliaciones/listar-conciliaciones.js';
import { MarcarMovimientos } from '../aplicacion/casos-uso/conciliaciones/marcar-movimientos.js';
import { ObtenerConciliacion } from '../aplicacion/casos-uso/conciliaciones/obtener-conciliacion.js';
import { QuitarEstadoDeCuenta } from '../aplicacion/casos-uso/conciliaciones/quitar-estado-de-cuenta.js';
import { SubirEstadoDeCuenta } from '../aplicacion/casos-uso/conciliaciones/subir-estado-de-cuenta.js';
import { TerminarConciliacion } from '../aplicacion/casos-uso/conciliaciones/terminar-conciliacion.js';
import { TranscribirSaldo } from '../aplicacion/casos-uso/conciliaciones/transcribir-saldo.js';
import { DesmarcarNota } from '../aplicacion/casos-uso/movimientos/desmarcar-nota.js';
import { ConciliacionesControlador } from '../http/conciliaciones.controlador.js';
import { rutasConciliaciones } from '../http/conciliaciones.rutas.js';
import { dependenciasDeNotas } from './notas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { PoliticaDeEstadoDeCuentaEnConfiguracion } from '../infraestructura/politica-de-estado-de-cuenta.configuracion.js';
import { ConsultasConciliacionesDrizzle } from '../infraestructura/persistencia/consultas-conciliaciones.drizzle.js';
import { ConsultasMovimientosDrizzle } from '../infraestructura/persistencia/consultas-movimientos.drizzle.js';
import { RepositorioConciliacionesDrizzle } from '../infraestructura/persistencia/repositorio-conciliaciones.drizzle.js';

function dependenciasDeConciliaciones() {
  const { unidadDeTrabajo, auditoria, reloj, documentos } = dependenciasCompartidas();
  return {
    unidadDeTrabajo,
    auditoria,
    reloj,
    documentos,
    politicaDeEstadoDeCuenta: new PoliticaDeEstadoDeCuentaEnConfiguracion(),
    repositorio: new RepositorioConciliacionesDrizzle(),
    consultas: new ConsultasConciliacionesDrizzle(),
    consultasMovimientos: new ConsultasMovimientosDrizzle(),
    cargaInicial: new CargaInicialEnMediador(),
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
    transcribirSaldo: new TranscribirSaldo(dependencias),
    subirEstadoDeCuenta: new SubirEstadoDeCuenta(dependencias),
    quitarEstadoDeCuenta: new QuitarEstadoDeCuenta(dependencias),
    abrirEstadoDeCuenta: new AbrirEstadoDeCuenta(dependencias),
    terminar: new TerminarConciliacion(dependencias),
    autorizar: new AutorizarConciliacion(dependencias),
    devolver: new DevolverConciliacion(dependencias),
    eliminar: new EliminarConciliacion(dependencias),
    desmarcarNota: new DesmarcarNotaEnConciliacion({
      conciliaciones: dependencias,
      desmarcarNota: new DesmarcarNota(dependenciasDeNotas()),
    }),
  };
  return rutasConciliaciones(new ConciliacionesControlador(casos));
}
