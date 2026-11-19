import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/caja-chica.contratos.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { PublicadorEventosTrasConfirmar } from '../../core/compartido/infraestructura/publicador-eventos-tras-confirmar.js';
import { AnularArqueo } from '../aplicacion/casos-uso/arqueos/anular-arqueo.js';
import { ListarArqueos, ObtenerArqueo, ProponerArqueo } from '../aplicacion/casos-uso/arqueos/consultas-de-arqueos.js';
import type { DependenciasDeArqueos } from '../aplicacion/casos-uso/arqueos/dependencias-de-arqueos.js';
import { RegistrarArqueo } from '../aplicacion/casos-uso/arqueos/registrar-arqueo.js';
import { ArqueosControlador } from '../http/arqueos.controlador.js';
import { rutasDeArqueos } from '../http/arqueos.rutas.js';
import { ConfiguracionDeArqueosEnConfiguracion } from '../infraestructura/apoyos-de-arqueos.js';
import { ComprobantesDelArqueoDrizzle } from '../infraestructura/persistencia/comprobantes-del-arqueo.drizzle.js';
import { ConsultasDeFondosDrizzle } from '../infraestructura/persistencia/consultas-de-fondos.drizzle.js';
import {
  ConsultasDeArqueosDrizzle,
  RepositorioDeArqueosDrizzle,
} from '../infraestructura/persistencia/repositorio-de-arqueos.drizzle.js';
import { RepositorioDeFondosDrizzle } from '../infraestructura/persistencia/repositorio-de-fondos.drizzle.js';

/** Raíz de composición de los arqueos: la lista de un fondo, el acta, la propuesta, registrar y anular. */
export function rutasDeArqueosComponidas(): FastifyPluginAsync {
  const dependencias = dependenciasDeArqueos();
  return rutasDeArqueos(
    new ArqueosControlador({
      listar: new ListarArqueos(dependencias),
      obtener: new ObtenerArqueo(dependencias),
      propuesta: new ProponerArqueo(dependencias),
      registrar: new RegistrarArqueo(dependencias),
      anular: new AnularArqueo(dependencias),
    }),
  );
}

export function dependenciasDeArqueos(): DependenciasDeArqueos {
  const compartidas = dependenciasCompartidas();
  return {
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    fondos: new RepositorioDeFondosDrizzle(),
    consultasDeFondos: new ConsultasDeFondosDrizzle(),
    arqueos: new RepositorioDeArqueosDrizzle(),
    consultas: new ConsultasDeArqueosDrizzle(),
    comprobantes: new ComprobantesDelArqueoDrizzle(),
    configuracion: new ConfiguracionDeArqueosEnConfiguracion(),
    correlativos: compartidas.correlativos,
    auditoria: compartidas.auditoria,
    publicadorEventos: new PublicadorEventosTrasConfirmar(compartidas.publicadorEventos),
    reloj: compartidas.reloj,
    ahora: () => new Date(),
  };
}
