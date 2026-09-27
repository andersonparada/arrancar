import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../compartido/http/operador-de-la-solicitud.js';
import { contextoDe } from '../../compartido/http/contexto-de-la-solicitud.js';
import type { ActualizarRol } from '../aplicacion/casos-uso/actualizar-rol.js';
import type { CrearRol } from '../aplicacion/casos-uso/crear-rol.js';
import type { EliminarRol } from '../aplicacion/casos-uso/eliminar-rol.js';
import type { ListarPermisosAsignables } from '../aplicacion/casos-uso/listar-permisos-asignables.js';
import type { ListarRoles } from '../aplicacion/casos-uso/listar-roles.js';
import type { ParamsRol, RolSolicitado } from './roles.esquemas-http.js';

export interface CasosDeUsoDeRoles {
  listar: ListarRoles;
  listarPermisos: ListarPermisosAsignables;
  crear: CrearRol;
  actualizar: ActualizarRol;
  eliminar: EliminarRol;
}

export class RolesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeRoles) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  listarPermisos = (solicitud: FastifyRequest) =>
    this.casosDeUso.listarPermisos.ejecutar(contextoDe(solicitud).modulosActivos);

  crear = async (solicitud: FastifyRequest<{ Body: RolSolicitado }>, respuesta: FastifyReply) => {
    const creado = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(creado);
  };

  actualizar = async (
    solicitud: FastifyRequest<{ Params: ParamsRol; Body: RolSolicitado }>,
    respuesta: FastifyReply,
  ) => {
    await this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      rolId: solicitud.params.rolId,
      solicitud: solicitud.body,
    });
    return respuesta.status(204).send();
  };

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsRol }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.rolId);
    return respuesta.status(204).send();
  };
}
