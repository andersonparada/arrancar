import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/bancos.contratos.js';
import '../../core/contratos/caja-chica.contratos.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { PublicadorEventosTrasConfirmar } from '../../core/compartido/infraestructura/publicador-eventos-tras-confirmar.js';
import { AnularReposicion } from '../aplicacion/casos-uso/reposiciones/anular-reposicion.js';
import {
  ListarReposiciones,
  ObtenerReposicion,
  SolicitarReposicion,
} from '../aplicacion/casos-uso/reposiciones/consultas-de-reposiciones.js';
import type { DependenciasDeReposiciones } from '../aplicacion/casos-uso/reposiciones/dependencias-de-reposiciones.js';
import { RegistrarReposicion } from '../aplicacion/casos-uso/reposiciones/registrar-reposicion.js';
import { ReposicionesControlador } from '../http/reposiciones.controlador.js';
import { rutasDeReposiciones } from '../http/reposiciones.rutas.js';
import { FondosEnBancosEnMediador } from '../infraestructura/fondos-en-bancos-en-mediador.js';
import {
  ConciliacionDeMovimientosDrizzle,
  ConfiguracionDeControlEnConfiguracion,
  LibroParaReponerEnMediador,
} from '../infraestructura/apoyos-de-reposiciones.js';
import {
  MovimientosDeFondosDrizzle,
  ReferenciasDeFondosDrizzle,
} from '../infraestructura/persistencia/apoyos-de-fondos.drizzle.js';
import { ConsultasDeFondosDrizzle } from '../infraestructura/persistencia/consultas-de-fondos.drizzle.js';
import {
  ComprobantesParaReponerDrizzle,
  ConsultasDeReposicionesDrizzle,
} from '../infraestructura/persistencia/consultas-de-reposiciones.drizzle.js';
import { RepositorioDeFondosDrizzle } from '../infraestructura/persistencia/repositorio-de-fondos.drizzle.js';
import { RepositorioDeReposicionesDrizzle } from '../infraestructura/persistencia/repositorio-de-reposiciones.drizzle.js';
import { atenderAvisosDeBancos } from './avisos-de-bancos.js';

/**
 * Raíz de composición de las reposiciones: la lista de un fondo, su solicitud, la ficha, reponer y anular. También
 * atiende, junto con los fondos, el aviso de Bancos antes de cambiar el cheque o la nota de una reposición.
 */
export function rutasDeReposicionesComponidas(): FastifyPluginAsync {
  const dependencias = dependenciasDeReposiciones();
  atenderAvisosDeBancos(dependencias);
  return rutasDeReposiciones(
    new ReposicionesControlador({
      listar: new ListarReposiciones(dependencias),
      obtener: new ObtenerReposicion(dependencias),
      solicitud: new SolicitarReposicion(dependencias),
      registrar: new RegistrarReposicion(dependencias),
      anular: new AnularReposicion(dependencias),
    }),
  );
}

export function dependenciasDeReposiciones(): DependenciasDeReposiciones {
  const compartidas = dependenciasCompartidas();
  return {
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    fondos: new RepositorioDeFondosDrizzle(),
    consultasDeFondos: new ConsultasDeFondosDrizzle(),
    referencias: new ReferenciasDeFondosDrizzle(),
    reposiciones: new RepositorioDeReposicionesDrizzle(),
    consultas: new ConsultasDeReposicionesDrizzle(),
    comprobantes: new ComprobantesParaReponerDrizzle(),
    bancos: new FondosEnBancosEnMediador(new MovimientosDeFondosDrizzle()),
    conciliacion: new ConciliacionDeMovimientosDrizzle(),
    libro: new LibroParaReponerEnMediador(),
    configuracion: new ConfiguracionDeControlEnConfiguracion(),
    correlativos: compartidas.correlativos,
    auditoria: compartidas.auditoria,
    publicadorEventos: new PublicadorEventosTrasConfirmar(compartidas.publicadorEventos),
    reloj: compartidas.reloj,
  };
}
