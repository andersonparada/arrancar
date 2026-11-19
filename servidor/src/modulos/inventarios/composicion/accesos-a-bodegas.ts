import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { permisosDeUsuario } from '../../core/autorizacion/contexto.js';
import { ListarBodegasParaAsignar } from '../aplicacion/casos-uso/accesos/listar-bodegas-para-asignar.js';
import { ListarUsuariosDeBodega } from '../aplicacion/casos-uso/accesos/listar-usuarios-de-bodega.js';
import { ListarUsuariosParaAccesos } from '../aplicacion/casos-uso/accesos/listar-usuarios-para-accesos.js';
import { ObtenerAccesosDeUsuario } from '../aplicacion/casos-uso/accesos/obtener-accesos-de-usuario.js';
import { ReemplazarAccesosDeUsuario } from '../aplicacion/casos-uso/accesos/reemplazar-accesos-de-usuario.js';
import { AccesosABodegasControlador } from '../http/accesos-a-bodegas.controlador.js';
import { rutasAccesosABodegas } from '../http/accesos-a-bodegas.rutas.js';
import { AsignacionesDeBodegasDrizzle } from '../infraestructura/persistencia/asignaciones-de-bodegas.drizzle.js';
import { ConsultasDeAccesosABodegasDrizzle } from '../infraestructura/persistencia/consultas-de-accesos-a-bodegas.drizzle.js';
import { ConsultasBodegasDrizzle } from '../infraestructura/persistencia/consultas-bodegas.drizzle.js';

/** Raíz de composición de la ventana de accesos a bodegas. */
export function rutasDeAccesosABodegas() {
  const { unidadDeTrabajo, auditoria } = dependenciasCompartidas();
  const dependencias = {
    unidadDeTrabajo,
    auditoria,
    consultas: new ConsultasBodegasDrizzle(),
    asignaciones: new AsignacionesDeBodegasDrizzle(),
    permisosDeUsuario,
  };
  return rutasAccesosABodegas(
    new AccesosABodegasControlador({
      listarBodegas: new ListarBodegasParaAsignar(dependencias),
      listarUsuarios: new ListarUsuariosParaAccesos(dependencias),
      obtenerAccesos: new ObtenerAccesosDeUsuario(dependencias),
      reemplazarAccesos: new ReemplazarAccesosDeUsuario(dependencias),
      listarUsuariosDeBodega: new ListarUsuariosDeBodega({
        unidadDeTrabajo,
        consultas: dependencias.consultas,
        accesos: new ConsultasDeAccesosABodegasDrizzle(),
      }),
    }),
  );
}
