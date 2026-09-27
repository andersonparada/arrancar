import type { FastifyReply, FastifyRequest } from 'fastify';
import { contextoDe } from '../http/contexto-solicitud.js';
import { leerImagenDeSolicitud } from '../compartido/http/leer-imagen.js';
import { aparienciaServicio } from '../servicios/apariencia.servicio.js';
import type { AparienciaSolicitada } from '../validaciones/apariencia.validaciones.js';

export const aparienciaControlador = {
  obtener() {
    return aparienciaServicio.obtener();
  },

  async obtenerLogo(solicitud: FastifyRequest<{ Querystring: { v?: string } }>, respuesta: FastifyReply) {
    const contenido = await aparienciaServicio.abrirLogo();
    const cache = solicitud.query.v ? 'public, max-age=31536000, immutable' : 'no-cache';
    return respuesta.header('Content-Type', 'image/png').header('Cache-Control', cache).send(contenido);
  },

  guardar(solicitud: FastifyRequest<{ Body: AparienciaSolicitada }>) {
    return aparienciaServicio.guardar(solicitud.body, contextoDe(solicitud).usuario.id);
  },

  restablecer() {
    return aparienciaServicio.restablecer();
  },

  async cambiarLogo(solicitud: FastifyRequest) {
    const imagen = await leerImagenDeSolicitud(solicitud);
    return aparienciaServicio.cambiarLogo(imagen, contextoDe(solicitud).usuario.id);
  },

  quitarLogo() {
    return aparienciaServicio.quitarLogo();
  },
};
