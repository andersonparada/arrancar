import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarTipoDeParcela } from '../aplicacion/casos-uso/tipos-de-parcela/actualizar-tipo-de-parcela.js';
import type { CrearTipoDeParcela } from '../aplicacion/casos-uso/tipos-de-parcela/crear-tipo-de-parcela.js';
import type { EliminarTipoDeParcela } from '../aplicacion/casos-uso/tipos-de-parcela/eliminar-tipo-de-parcela.js';
import type { ListarTiposDeParcela } from '../aplicacion/casos-uso/tipos-de-parcela/listar-tipos-de-parcela.js';
import type { ObtenerTipoDeParcela } from '../aplicacion/casos-uso/tipos-de-parcela/obtener-tipo-de-parcela.js';
import type { TipoDeParcelaSolicitado, ParamsTipoDeParcela } from './tipos-de-parcela.esquemas-http.js';

export interface CasosDeUsoDeTiposDeParcela {
  listar: ListarTiposDeParcela;
  obtener: ObtenerTipoDeParcela;
  crear: CrearTipoDeParcela;
  actualizar: ActualizarTipoDeParcela;
  eliminar: EliminarTipoDeParcela;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class TiposDeParcelaControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeTiposDeParcela) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsTipoDeParcela }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.tipoDeParcelaId);

  crear = async (solicitud: FastifyRequest<{ Body: TipoDeParcelaSolicitado }>, respuesta: FastifyReply) => {
    const tipoDeParcela = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(tipoDeParcela);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsTipoDeParcela; Body: TipoDeParcelaSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      tipoDeParcelaId: solicitud.params.tipoDeParcelaId,
      solicitud: solicitud.body,
    });

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsTipoDeParcela }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.tipoDeParcelaId);
    return respuesta.status(204).send();
  };
}
