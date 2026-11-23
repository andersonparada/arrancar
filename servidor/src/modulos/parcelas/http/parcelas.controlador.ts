import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarParcela } from '../aplicacion/casos-uso/parcelas/actualizar-parcela.js';
import type { CrearParcela } from '../aplicacion/casos-uso/parcelas/crear-parcela.js';
import type { EliminarParcela } from '../aplicacion/casos-uso/parcelas/eliminar-parcela.js';
import type { InactivarParcela } from '../aplicacion/casos-uso/parcelas/inactivar-parcela.js';
import type { ListarArbolDeParcelas } from '../aplicacion/casos-uso/parcelas/listar-arbol-de-parcelas.js';
import type { ListarParcelas } from '../aplicacion/casos-uso/parcelas/listar-parcelas.js';
import type { ObtenerParcela } from '../aplicacion/casos-uso/parcelas/obtener-parcela.js';
import type { ReactivarParcela } from '../aplicacion/casos-uso/parcelas/reactivar-parcela.js';
import type { FiltrosDeParcelas } from '../aplicacion/dto/parcela.dto.js';
import type {
  CambioDeParcelaSolicitado,
  FiltrosDeParcelasSolicitados,
  InactivacionDeParcelaSolicitada,
  ParamsParcela,
  ParcelaSolicitada,
} from './parcelas.esquemas-http.js';

export interface CasosDeUsoDeParcelas {
  listar: ListarParcelas;
  listarArbol: ListarArbolDeParcelas;
  obtener: ObtenerParcela;
  crear: CrearParcela;
  actualizar: ActualizarParcela;
  inactivar: InactivarParcela;
  reactivar: ReactivarParcela;
  eliminar: EliminarParcela;
}

/** Los filtros de la lista, sin el `arbol` y con `soloActivas` como booleano. */
function filtrosDe({ arbol: _arbol, soloActivas, ...resto }: FiltrosDeParcelasSolicitados): FiltrosDeParcelas {
  return { ...resto, ...(soloActivas === undefined ? {} : { soloActivas: soloActivas === 'true' }) };
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ParcelasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeParcelas) {}

  listar = (solicitud: FastifyRequest<{ Querystring: FiltrosDeParcelasSolicitados }>) => {
    const operador = operadorDe(solicitud);
    const filtros = filtrosDe(solicitud.query);
    return solicitud.query.arbol === 'true'
      ? this.casosDeUso.listarArbol.ejecutar(operador, filtros)
      : this.casosDeUso.listar.ejecutar(operador, filtros);
  };

  obtener = (solicitud: FastifyRequest<{ Params: ParamsParcela }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.parcelaId);

  crear = async (solicitud: FastifyRequest<{ Body: ParcelaSolicitada }>, respuesta: FastifyReply) => {
    const parcela = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(parcela);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsParcela; Body: CambioDeParcelaSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      parcelaId: solicitud.params.parcelaId,
      solicitud: solicitud.body,
    });

  inactivar = (solicitud: FastifyRequest<{ Params: ParamsParcela; Body: InactivacionDeParcelaSolicitada }>) =>
    this.casosDeUso.inactivar.ejecutar(operadorDe(solicitud), {
      parcelaId: solicitud.params.parcelaId,
      ...(solicitud.body.fecha ? { fecha: solicitud.body.fecha } : {}),
    });

  reactivar = (solicitud: FastifyRequest<{ Params: ParamsParcela }>) =>
    this.casosDeUso.reactivar.ejecutar(operadorDe(solicitud), { parcelaId: solicitud.params.parcelaId });

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsParcela }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.parcelaId);
    return respuesta.status(204).send();
  };
}
