import type { FastifyReply, FastifyRequest } from 'fastify';
import { empresaActivaDe } from '../../core/http/contexto-solicitud.js';
import { papelesServicio } from '../servicios/papeles.servicio.js';
import type {
  CategoriaProveedorSolicitada,
  ClienteSolicitado,
  ProveedorSolicitado,
  TrabajadorSolicitado,
} from '../validaciones/papeles.validaciones.js';
import type { ParamsTercero } from '../validaciones/terceros.validaciones.js';

interface ParamsCategoria {
  categoriaId: string;
}

export const papelesControlador = {
  asignarCliente(solicitud: FastifyRequest<{ Params: ParamsTercero; Body: ClienteSolicitado }>) {
    return papelesServicio.asignarCliente(empresaActivaDe(solicitud), solicitud.params.terceroId, solicitud.body);
  },

  async quitarCliente(solicitud: FastifyRequest<{ Params: ParamsTercero }>, respuesta: FastifyReply) {
    await papelesServicio.quitarCliente(empresaActivaDe(solicitud), solicitud.params.terceroId);
    return respuesta.status(204).send();
  },

  asignarProveedor(solicitud: FastifyRequest<{ Params: ParamsTercero; Body: ProveedorSolicitado }>) {
    return papelesServicio.asignarProveedor(empresaActivaDe(solicitud), solicitud.params.terceroId, solicitud.body);
  },

  async quitarProveedor(solicitud: FastifyRequest<{ Params: ParamsTercero }>, respuesta: FastifyReply) {
    await papelesServicio.quitarProveedor(empresaActivaDe(solicitud), solicitud.params.terceroId);
    return respuesta.status(204).send();
  },

  listarCategorias(solicitud: FastifyRequest) {
    return papelesServicio.listarCategorias(empresaActivaDe(solicitud));
  },

  async crearCategoria(solicitud: FastifyRequest<{ Body: CategoriaProveedorSolicitada }>, respuesta: FastifyReply) {
    const categoria = await papelesServicio.crearCategoria(empresaActivaDe(solicitud), solicitud.body);
    return respuesta.status(201).send(categoria);
  },

  actualizarCategoria(solicitud: FastifyRequest<{ Params: ParamsCategoria; Body: CategoriaProveedorSolicitada }>) {
    return papelesServicio.actualizarCategoria(empresaActivaDe(solicitud), solicitud.params.categoriaId, solicitud.body);
  },

  asignarTrabajador(solicitud: FastifyRequest<{ Params: ParamsTercero; Body: TrabajadorSolicitado }>) {
    return papelesServicio.asignarTrabajador(empresaActivaDe(solicitud), solicitud.params.terceroId, solicitud.body);
  },

  async quitarTrabajador(solicitud: FastifyRequest<{ Params: ParamsTercero }>, respuesta: FastifyReply) {
    await papelesServicio.quitarTrabajador(empresaActivaDe(solicitud), solicitud.params.terceroId);
    return respuesta.status(204).send();
  },
};
