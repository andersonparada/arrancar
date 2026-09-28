import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { CambiarEstadoDeChequera } from '../aplicacion/casos-uso/chequeras/cambiar-estado-de-chequera.js';
import { CrearChequera } from '../aplicacion/casos-uso/chequeras/crear-chequera.js';
import { ListarChequeras } from '../aplicacion/casos-uso/chequeras/listar-chequeras.js';
import { ListarCheques } from '../aplicacion/casos-uso/cheques/listar-cheques.js';
import { ChequerasControlador } from '../http/chequeras.controlador.js';
import { rutasChequeras } from '../http/chequeras.rutas.js';
import { ConsultasChequerasDrizzle } from '../infraestructura/persistencia/consultas-chequeras.drizzle.js';
import { ConsultasChequesDrizzle } from '../infraestructura/persistencia/consultas-cheques.drizzle.js';
import { ConsultasMovimientosDrizzle } from '../infraestructura/persistencia/consultas-movimientos.drizzle.js';
import { RepositorioChequerasDrizzle } from '../infraestructura/persistencia/repositorio-chequeras.drizzle.js';
import { RepositorioChequesDrizzle } from '../infraestructura/persistencia/repositorio-cheques.drizzle.js';
import { LimiteDeChequeraEnConfiguracion } from '../infraestructura/limite-de-chequera.configuracion.js';

function dependenciasDeChequeras() {
  const { unidadDeTrabajo, auditoria } = dependenciasCompartidas();
  return {
    unidadDeTrabajo,
    auditoria,
    repositorio: new RepositorioChequerasDrizzle(),
    repositorioCheques: new RepositorioChequesDrizzle(),
    consultas: new ConsultasChequerasDrizzle(),
    consultasMovimientos: new ConsultasMovimientosDrizzle(),
    limiteDeChequera: new LimiteDeChequeraEnConfiguracion(),
  };
}

/** Raíz de composición de las chequeras: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeChequeras() {
  const dependencias = dependenciasDeChequeras();
  const consultasCheques = new ConsultasChequesDrizzle();
  const casos = {
    listar: new ListarChequeras(dependencias),
    crear: new CrearChequera(dependencias),
    cambiarEstado: new CambiarEstadoDeChequera(dependencias),
    listarCheques: new ListarCheques({ unidadDeTrabajo: dependencias.unidadDeTrabajo, consultas: consultasCheques }),
  };
  return rutasChequeras(new ChequerasControlador(casos));
}
