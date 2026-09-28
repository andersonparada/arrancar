import { bd } from '../base-datos/conexion.js';
import type { DependenciasCompartidas } from '../compartido/aplicacion/dependencias-compartidas.js';
import { ActualizarRol } from './aplicacion/casos-uso/actualizar-rol.js';
import { CrearRol } from './aplicacion/casos-uso/crear-rol.js';
import { EliminarRol } from './aplicacion/casos-uso/eliminar-rol.js';
import { ListarPermisosAsignables } from './aplicacion/casos-uso/listar-permisos-asignables.js';
import { ListarRoles } from './aplicacion/casos-uso/listar-roles.js';
import { RolesControlador } from './http/roles.controlador.js';
import { rutasRoles } from './http/roles.rutas.js';
import { CatalogoDePermisosEnRegistro } from './infraestructura/catalogo-de-permisos-en-registro.js';
import { ConsultasRolesDrizzle } from './infraestructura/persistencia/consultas-roles.drizzle.js';
import { RepositorioRolesDrizzle } from './infraestructura/persistencia/repositorio-roles.drizzle.js';

/** La sesión y los usuarios también consultan los roles con esta pieza. */
export const consultasRoles = new ConsultasRolesDrizzle(bd);

/** Raíz de composición del contexto de autorización. */
export function componerAutorizacion({ unidadDeTrabajo, auditoria }: DependenciasCompartidas) {
  const repositorio = new RepositorioRolesDrizzle();
  const catalogo = new CatalogoDePermisosEnRegistro();
  const controlador = new RolesControlador({
    listar: new ListarRoles({ consultas: consultasRoles }),
    listarPermisos: new ListarPermisosAsignables({ catalogo }),
    crear: new CrearRol({ unidadDeTrabajo, repositorio, catalogo }),
    actualizar: new ActualizarRol({ unidadDeTrabajo, repositorio, catalogo }),
    eliminar: new EliminarRol({ unidadDeTrabajo, repositorio, auditoria }),
  });
  return rutasRoles(controlador);
}
