import type { FastifyReply, FastifyRequest } from 'fastify';
import { empresaActivaDe } from '../../core/http/contexto-solicitud.js';
import { contactosServicio } from '../servicios/contactos.servicio.js';
import type { ContactoSolicitado, ParamsContacto } from '../validaciones/contactos.validaciones.js';
import type { ParamsTercero } from '../validaciones/terceros.validaciones.js';

export const contactosControlador = {
  listar(solicitud: FastifyRequest<{ Params: ParamsTercero }>) {
    return contactosServicio.listar(empresaActivaDe(solicitud), solicitud.params.terceroId);
  },

  async crear(solicitud: FastifyRequest<{ Params: ParamsTercero; Body: ContactoSolicitado }>, respuesta: FastifyReply) {
    const contacto = await contactosServicio.crear(empresaActivaDe(solicitud), solicitud.params.terceroId, solicitud.body);
    return respuesta.status(201).send(contacto);
  },

  actualizar(solicitud: FastifyRequest<{ Params: ParamsContacto; Body: ContactoSolicitado }>) {
    return contactosServicio.actualizar(empresaActivaDe(solicitud), solicitud.params.contactoId, solicitud.body);
  },

  async eliminar(solicitud: FastifyRequest<{ Params: ParamsContacto }>, respuesta: FastifyReply) {
    await contactosServicio.eliminar(empresaActivaDe(solicitud), solicitud.params.contactoId);
    return respuesta.status(204).send();
  },
};
