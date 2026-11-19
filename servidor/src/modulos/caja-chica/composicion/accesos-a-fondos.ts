import type { FastifyPluginAsync } from 'fastify';
import { permisosDeUsuario } from '../../core/autorizacion/contexto.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import {
  ListarFondosParaAsignar,
  ListarUsuariosParaAccesos,
  ObtenerAccesosDeUsuario,
} from '../aplicacion/casos-uso/accesos/accesos-a-fondos.js';
import { ReemplazarAccesosDeUsuario } from '../aplicacion/casos-uso/accesos/reemplazar-accesos-de-usuario.js';
import { AccesosAFondosControlador } from '../http/accesos-a-fondos.controlador.js';
import { rutasAccesosAFondos } from '../http/accesos-a-fondos.rutas.js';
import { AsignacionesDeFondosDrizzle } from '../infraestructura/persistencia/asignaciones-de-fondos.drizzle.js';

/** Raíz de composición de la ventana de accesos a fondos. */
export function rutasDeAccesosAFondosComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo, auditoria } = dependenciasCompartidas();
  const dependencias = {
    unidadDeTrabajo,
    auditoria,
    asignaciones: new AsignacionesDeFondosDrizzle(),
    permisosDeUsuario,
  };
  return rutasAccesosAFondos(
    new AccesosAFondosControlador({
      listarFondos: new ListarFondosParaAsignar(dependencias),
      listarUsuarios: new ListarUsuariosParaAccesos(dependencias),
      obtenerAccesos: new ObtenerAccesosDeUsuario(dependencias),
      reemplazarAccesos: new ReemplazarAccesosDeUsuario(dependencias),
    }),
  );
}
