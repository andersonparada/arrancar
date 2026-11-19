import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarCategoria } from '../aplicacion/casos-uso/categorias/actualizar-categoria.js';
import type { CrearCategoria } from '../aplicacion/casos-uso/categorias/crear-categoria.js';
import type { EliminarCategoria } from '../aplicacion/casos-uso/categorias/eliminar-categoria.js';
import type { ListarCategorias } from '../aplicacion/casos-uso/categorias/listar-categorias.js';
import type { ObtenerCategoria } from '../aplicacion/casos-uso/categorias/obtener-categoria.js';
import type { CategoriaSolicitado, ParamsCategoria } from './categorias.esquemas-http.js';

export interface CasosDeUsoDeCategorias {
  listar: ListarCategorias;
  obtener: ObtenerCategoria;
  crear: CrearCategoria;
  actualizar: ActualizarCategoria;
  eliminar: EliminarCategoria;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class CategoriasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeCategorias) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsCategoria }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.categoriaId);

  crear = async (solicitud: FastifyRequest<{ Body: CategoriaSolicitado }>, respuesta: FastifyReply) => {
    const categoria = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(categoria);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsCategoria; Body: CategoriaSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      categoriaId: solicitud.params.categoriaId,
      solicitud: solicitud.body,
    });

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsCategoria }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.categoriaId);
    return respuesta.status(204).send();
  };
}
