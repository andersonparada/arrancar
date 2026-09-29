import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { permisosDeUsuario } from '../../core/autorizacion/contexto.js';
import { ListarLocalidadesParaAsignar } from '../aplicacion/casos-uso/accesos/listar-localidades-para-asignar.js';
import { ListarUsuariosDeLocalidad } from '../aplicacion/casos-uso/accesos/listar-usuarios-de-localidad.js';
import { ListarUsuariosParaAccesos } from '../aplicacion/casos-uso/accesos/listar-usuarios-para-accesos.js';
import { ObtenerAccesosDeUsuario } from '../aplicacion/casos-uso/accesos/obtener-accesos-de-usuario.js';
import { ReemplazarAccesosDeUsuario } from '../aplicacion/casos-uso/accesos/reemplazar-accesos-de-usuario.js';
import { AccesosALocalidadesControlador } from '../http/accesos-a-localidades.controlador.js';
import { rutasAccesosALocalidades } from '../http/accesos-a-localidades.rutas.js';
import { AsignacionesDeLocalidadesDrizzle } from '../infraestructura/persistencia/asignaciones-de-localidades.drizzle.js';
import { ConsultasDeAccesosALocalidadesDrizzle } from '../infraestructura/persistencia/consultas-de-accesos-a-localidades.drizzle.js';
import { ConsultasLocalidadesDrizzle } from '../infraestructura/persistencia/consultas-localidades.drizzle.js';

/** Raíz de composición de la ventana de accesos a localidades. */
export function rutasDeAccesosALocalidades() {
  const { unidadDeTrabajo, auditoria } = dependenciasCompartidas();
  const dependencias = {
    unidadDeTrabajo,
    auditoria,
    consultas: new ConsultasLocalidadesDrizzle(),
    asignaciones: new AsignacionesDeLocalidadesDrizzle(),
    permisosDeUsuario,
  };
  return rutasAccesosALocalidades(
    new AccesosALocalidadesControlador({
      listarLocalidades: new ListarLocalidadesParaAsignar(dependencias),
      listarUsuarios: new ListarUsuariosParaAccesos(dependencias),
      obtenerAccesos: new ObtenerAccesosDeUsuario(dependencias),
      reemplazarAccesos: new ReemplazarAccesosDeUsuario(dependencias),
      listarUsuariosDeLocalidad: new ListarUsuariosDeLocalidad({
        unidadDeTrabajo,
        consultas: dependencias.consultas,
        accesos: new ConsultasDeAccesosALocalidadesDrizzle(),
      }),
    }),
  );
}
