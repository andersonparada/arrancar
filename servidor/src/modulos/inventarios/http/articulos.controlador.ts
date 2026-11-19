import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarArticulo } from '../aplicacion/casos-uso/articulos/actualizar-articulo.js';
import type { CrearArticulo } from '../aplicacion/casos-uso/articulos/crear-articulo.js';
import type { CrearLoteDeArticulo } from '../aplicacion/casos-uso/articulos/crear-lote-de-articulo.js';
import type { EliminarArticulo } from '../aplicacion/casos-uso/articulos/eliminar-articulo.js';
import type { ListarArticulos } from '../aplicacion/casos-uso/articulos/listar-articulos.js';
import type { ListarConceptosParaArticulos } from '../aplicacion/casos-uso/articulos/listar-conceptos-para-articulos.js';
import type { ListarConversionesDeArticulo } from '../aplicacion/casos-uso/articulos/listar-conversiones-de-articulo.js';
import type { ListarLotesDeArticulo } from '../aplicacion/casos-uso/articulos/listar-lotes-de-articulo.js';
import type { ObtenerArticulo } from '../aplicacion/casos-uso/articulos/obtener-articulo.js';
import type { ProponerCodigoDeArticulo } from '../aplicacion/casos-uso/articulos/proponer-codigo-de-articulo.js';
import type { ReemplazarConversionesDeArticulo } from '../aplicacion/casos-uso/articulos/reemplazar-conversiones-de-articulo.js';
import type {
  ArticuloSolicitado,
  ConversionesSolicitadas,
  LoteSolicitado,
  ParamsArticulo,
} from './articulos.esquemas-http.js';

export interface CasosDeUsoDeArticulos {
  listar: ListarArticulos;
  obtener: ObtenerArticulo;
  crear: CrearArticulo;
  actualizar: ActualizarArticulo;
  eliminar: EliminarArticulo;
  proponerCodigo: ProponerCodigoDeArticulo;
  listarConceptos: ListarConceptosParaArticulos;
  listarConversiones: ListarConversionesDeArticulo;
  reemplazarConversiones: ReemplazarConversionesDeArticulo;
  listarLotes: ListarLotesDeArticulo;
  crearLote: CrearLoteDeArticulo;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ArticulosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeArticulos) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsArticulo }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.articuloId);

  proponerCodigo = (solicitud: FastifyRequest) => this.casosDeUso.proponerCodigo.ejecutar(operadorDe(solicitud));

  listarConceptos = (solicitud: FastifyRequest) => this.casosDeUso.listarConceptos.ejecutar(operadorDe(solicitud));

  crear = async (solicitud: FastifyRequest<{ Body: ArticuloSolicitado }>, respuesta: FastifyReply) => {
    const articulo = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(articulo);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsArticulo; Body: ArticuloSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      articuloId: solicitud.params.articuloId,
      solicitud: solicitud.body,
    });

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsArticulo }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.articuloId);
    return respuesta.status(204).send();
  };

  listarConversiones = (solicitud: FastifyRequest<{ Params: ParamsArticulo }>) =>
    this.casosDeUso.listarConversiones.ejecutar(operadorDe(solicitud), solicitud.params.articuloId);

  reemplazarConversiones = (solicitud: FastifyRequest<{ Params: ParamsArticulo; Body: ConversionesSolicitadas }>) =>
    this.casosDeUso.reemplazarConversiones.ejecutar(operadorDe(solicitud), {
      articuloId: solicitud.params.articuloId,
      solicitud: solicitud.body,
    });

  listarLotes = (solicitud: FastifyRequest<{ Params: ParamsArticulo }>) =>
    this.casosDeUso.listarLotes.ejecutar(operadorDe(solicitud), solicitud.params.articuloId);

  crearLote = async (
    solicitud: FastifyRequest<{ Params: ParamsArticulo; Body: LoteSolicitado }>,
    respuesta: FastifyReply,
  ) => {
    const lote = await this.casosDeUso.crearLote.ejecutar(operadorDe(solicitud), {
      articuloId: solicitud.params.articuloId,
      solicitud: solicitud.body,
    });
    return respuesta.status(201).send(lote);
  };
}
