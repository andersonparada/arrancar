import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { CerrarMes } from '../aplicacion/casos-uso/cierres/cerrar-mes.js';
import type { DependenciasDeCierres } from '../aplicacion/casos-uso/cierres/dependencias-de-cierres.js';
import { ListarCierres } from '../aplicacion/casos-uso/cierres/listar-cierres.js';
import { ListarExistenciasAlCierre } from '../aplicacion/casos-uso/cierres/listar-existencias-al-cierre.js';
import { ReabrirMes } from '../aplicacion/casos-uso/cierres/reabrir-mes.js';
import { RevisarCierre } from '../aplicacion/casos-uso/cierres/revisar-cierre.js';
import { CierresControlador } from '../http/cierres.controlador.js';
import { rutasCierres } from '../http/cierres.rutas.js';
import { CargaInicialEnMediador, MetodoInicialEnConfiguracion } from '../infraestructura/entorno-del-kardex.js';
import { PreguntasDelCierreEnMediador } from '../infraestructura/preguntas-del-cierre-en-mediador.js';
import { ConsultasDeCierreDrizzle } from '../infraestructura/persistencia/consultas-de-cierre.drizzle.js';
import { ConsultasPorRecibirDrizzle } from '../infraestructura/persistencia/consultas-por-recibir.drizzle.js';
import { RepositorioDeCierresDrizzle } from '../infraestructura/persistencia/repositorio-de-cierres.drizzle.js';
import { RepositorioDeMetodosDrizzle } from '../infraestructura/persistencia/repositorio-de-metodos.drizzle.js';

function dependenciasDeCierres(): DependenciasDeCierres {
  const compartidas = dependenciasCompartidas();
  return {
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    auditoria: compartidas.auditoria,
    reloj: compartidas.reloj,
    publicadorEventos: compartidas.publicadorEventos,
    cierres: new RepositorioDeCierresDrizzle(),
    consultas: new ConsultasDeCierreDrizzle(),
    bandeja: new ConsultasPorRecibirDrizzle(),
    preguntas: new PreguntasDelCierreEnMediador(),
    cargaInicial: new CargaInicialEnMediador(),
    metodos: new RepositorioDeMetodosDrizzle(),
    metodoInicial: new MetodoInicialEnConfiguracion(),
  };
}

/** Raíz de composición del cierre mensual: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeCierres() {
  const dependencias = dependenciasDeCierres();
  return rutasCierres(
    new CierresControlador({
      listar: new ListarCierres(dependencias),
      revisar: new RevisarCierre(dependencias),
      cerrar: new CerrarMes(dependencias),
      reabrir: new ReabrirMes(dependencias),
      existencias: new ListarExistenciasAlCierre(dependencias),
    }),
  );
}
