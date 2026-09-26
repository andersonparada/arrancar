import type { FastifyReply, FastifyRequest } from 'fastify';
import { contextoDe, empresaActivaDe } from '../http/contexto-solicitud.js';
import { rolesServicio } from '../servicios/roles.servicio.js';
import type { ParamsRol, RolSolicitado } from '../validaciones/roles.validaciones.js';

export const rolesControlador = {
  listar(solicitud: FastifyRequest) {
    return rolesServicio.listar(empresaActivaDe(solicitud).cuentaId);
  },

  catalogoPermisos(solicitud: FastifyRequest) {
    return rolesServicio.catalogoPermisos(contextoDe(solicitud).modulosActivos);
  },

  async crear(solicitud: FastifyRequest<{ Body: RolSolicitado }>, respuesta: FastifyReply) {
    const creado = await rolesServicio.crear(empresaActivaDe(solicitud).cuentaId, solicitud.body);
    return respuesta.status(201).send(creado);
  },

  async actualizar(solicitud: FastifyRequest<{ Params: ParamsRol; Body: RolSolicitado }>, respuesta: FastifyReply) {
    await rolesServicio.actualizar(empresaActivaDe(solicitud).cuentaId, solicitud.params.rolId, solicitud.body);
    return respuesta.status(204).send();
  },

  async eliminar(solicitud: FastifyRequest<{ Params: ParamsRol }>, respuesta: FastifyReply) {
    await rolesServicio.eliminar(empresaActivaDe(solicitud).cuentaId, solicitud.params.rolId);
    return respuesta.status(204).send();
  },
};
