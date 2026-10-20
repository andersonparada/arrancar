import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { CambiarControlDePeriodos } from '../aplicacion/casos-uso/periodos/cambiar-control-de-periodos.js';
import { ListarPeriodos, ObtenerPeriodo } from '../aplicacion/casos-uso/periodos/consultar-periodos.js';
import { DeclararPeriodo } from '../aplicacion/casos-uso/periodos/declarar-periodo.js';
import { ReabrirPeriodo } from '../aplicacion/casos-uso/periodos/reabrir-periodo.js';
import { PeriodosControlador } from '../http/periodos.controlador.js';
import { rutasDePeriodos } from '../http/periodos.rutas.js';
import { AjusteDelControlEnConfiguracion } from '../infraestructura/ajuste-del-control-en-configuracion.js';
import { ConsultasDelLibroDrizzle } from '../infraestructura/persistencia/consultas-del-libro.drizzle.js';
import { ConsultasDelPeriodoDrizzle } from '../infraestructura/persistencia/consultas-del-periodo.drizzle.js';
import { RepositorioDeDatosFiscalesDeEmpresaDrizzle } from '../infraestructura/persistencia/repositorio-de-datos-fiscales-de-empresa.drizzle.js';
import { RepositorioDePeriodosDrizzle } from '../infraestructura/persistencia/repositorio-de-periodos.drizzle.js';
import { IdentidadDeLaEmpresaEnMediador } from '../infraestructura/vecinos-en-mediador.js';

function dependenciasDePeriodos() {
  const compartidas = dependenciasCompartidas();
  return {
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    publicadorEventos: compartidas.publicadorEventos,
    auditoria: compartidas.auditoria,
    reloj: compartidas.reloj,
    consultas: new ConsultasDelLibroDrizzle(),
    identidad: new IdentidadDeLaEmpresaEnMediador(),
    datosFiscalesDeEmpresa: new RepositorioDeDatosFiscalesDeEmpresaDrizzle(),
    periodos: new RepositorioDePeriodosDrizzle(),
    consultasDelPeriodo: new ConsultasDelPeriodoDrizzle(),
    ajuste: new AjusteDelControlEnConfiguracion(),
  };
}

/** Raíz de composición de los períodos: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDePeriodosComponidas() {
  const dependencias = dependenciasDePeriodos();
  return rutasDePeriodos(
    new PeriodosControlador({
      listar: new ListarPeriodos(dependencias),
      obtener: new ObtenerPeriodo(dependencias),
      declarar: new DeclararPeriodo(dependencias),
      reabrir: new ReabrirPeriodo(dependencias),
      control: new CambiarControlDePeriodos(dependencias),
    }),
  );
}
