import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { CambiarCategoria } from '../aplicacion/casos-uso/categorias/cambiar-categoria.js';
import type { CrearCategoria } from '../aplicacion/casos-uso/categorias/crear-categoria.js';
import type { ListarCategorias } from '../aplicacion/casos-uso/categorias/listar-categorias.js';
import type { AgregarContacto } from '../aplicacion/casos-uso/contactos/agregar-contacto.js';
import type { BuscarContactos } from '../aplicacion/casos-uso/contactos/buscar-contactos.js';
import type { CambiarContacto } from '../aplicacion/casos-uso/contactos/cambiar-contacto.js';
import type { EliminarContacto } from '../aplicacion/casos-uso/contactos/eliminar-contacto.js';
import type { ListarContactos } from '../aplicacion/casos-uso/contactos/listar-contactos.js';
import type {
  BusquedaDeContactosSolicitada,
  CategoriaSolicitada,
  ContactoSolicitado,
  ParamsCategoria,
  ParamsContacto,
  ParamsTercero,
} from './terceros.esquemas-http.js';

export interface CasosDeUsoDeContactos {
  listar: ListarContactos;
  agregar: AgregarContacto;
  cambiar: CambiarContacto;
  eliminar: EliminarContacto;
  buscar: BuscarContactos;
}

export class ContactosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeContactos) {}

  buscar = (solicitud: FastifyRequest<{ Querystring: BusquedaDeContactosSolicitada }>) =>
    this.casosDeUso.buscar.ejecutar(operadorDe(solicitud), solicitud.query.texto);

  listar = (solicitud: FastifyRequest<{ Params: ParamsTercero }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.params.terceroId);

  agregar = async (
    solicitud: FastifyRequest<{ Params: ParamsTercero; Body: ContactoSolicitado }>,
    respuesta: FastifyReply,
  ) => {
    const contacto = await this.casosDeUso.agregar.ejecutar(operadorDe(solicitud), {
      terceroId: solicitud.params.terceroId,
      solicitud: solicitud.body,
    });
    return respuesta.status(201).send(contacto);
  };

  cambiar = (solicitud: FastifyRequest<{ Params: ParamsContacto; Body: ContactoSolicitado }>) =>
    this.casosDeUso.cambiar.ejecutar(operadorDe(solicitud), { ...solicitud.params, solicitud: solicitud.body });

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsContacto }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params);
    return respuesta.status(204).send();
  };
}

export interface CasosDeUsoDeCategorias {
  listar: ListarCategorias;
  crear: CrearCategoria;
  cambiar: CambiarCategoria;
}

export class CategoriasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeCategorias) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  crear = async (solicitud: FastifyRequest<{ Body: CategoriaSolicitada }>, respuesta: FastifyReply) => {
    const categoria = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(categoria);
  };

  cambiar = (solicitud: FastifyRequest<{ Params: ParamsCategoria; Body: CategoriaSolicitada }>) =>
    this.casosDeUso.cambiar.ejecutar(operadorDe(solicitud), {
      categoriaId: solicitud.params.categoriaId,
      solicitud: solicitud.body,
    });
}
