import type { FastifyReply, FastifyRequest } from 'fastify';
import { contextoDe, empresaActivaDe } from '../../core/http/contexto-solicitud.js';
import { tercerosServicio } from '../servicios/terceros.servicio.js';
import type { FiltrosListarTerceros, ParamsTercero, TerceroSolicitado } from '../validaciones/terceros.validaciones.js';

function opcionesVisibilidad(solicitud: FastifyRequest) {
  return { puedeVerTrabajadores: contextoDe(solicitud).permisos.has('trabajadores.ver') };
}

export const tercerosControlador = {
  listar(solicitud: FastifyRequest<{ Querystring: FiltrosListarTerceros }>) {
    return tercerosServicio.listar(empresaActivaDe(solicitud), solicitud.query, opcionesVisibilidad(solicitud));
  },

  obtener(solicitud: FastifyRequest<{ Params: ParamsTercero }>) {
    return tercerosServicio.obtenerFicha(empresaActivaDe(solicitud), solicitud.params.terceroId, opcionesVisibilidad(solicitud));
  },

  async crear(solicitud: FastifyRequest<{ Body: TerceroSolicitado }>, respuesta: FastifyReply) {
    const tercero = await tercerosServicio.crear(empresaActivaDe(solicitud), solicitud.body);
    return respuesta.status(201).send(tercero);
  },

  actualizar(solicitud: FastifyRequest<{ Params: ParamsTercero; Body: TerceroSolicitado }>) {
    return tercerosServicio.actualizar(empresaActivaDe(solicitud), solicitud.params.terceroId, solicitud.body);
  },
};
