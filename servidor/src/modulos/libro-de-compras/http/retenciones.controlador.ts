import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnotarConstancia, QuitarConstancia } from '../aplicacion/casos-uso/retenciones/anotar-constancia.js';
import type { AnotarConstanciasEnLote } from '../aplicacion/casos-uso/retenciones/anotar-constancias-en-lote.js';
import type { ConsultarRetencionesDelMes } from '../aplicacion/casos-uso/retenciones/consultar-retenciones-del-mes.js';
import type { ConsultarPorResolver, ResolverRetencion } from '../aplicacion/casos-uso/retenciones/por-resolver.js';
import type {
  ConstanciaSolicitada,
  ConstanciasEnLoteSolicitadas,
  FiltroDeRetencionesSolicitado,
  ParamsDeRetencion,
  PorResolverSolicitado,
  QuitarConstanciaSolicitado,
  ResolucionSolicitada,
} from './retenciones.esquemas-http.js';

export interface CasosDeUsoDeRetenciones {
  reporte: ConsultarRetencionesDelMes;
  anotar: AnotarConstancia;
  anotarEnLote: AnotarConstanciasEnLote;
  quitar: QuitarConstancia;
  resolver: ResolverRetencion;
  porResolver: ConsultarPorResolver;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class RetencionesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeRetenciones) {}

  reporte = (solicitud: FastifyRequest<{ Querystring: FiltroDeRetencionesSolicitado }>) =>
    this.casosDeUso.reporte.ejecutar(operadorDe(solicitud), solicitud.query);

  anotar = (solicitud: FastifyRequest<{ Params: ParamsDeRetencion; Body: ConstanciaSolicitada }>) =>
    this.casosDeUso.anotar.ejecutar(operadorDe(solicitud), {
      retencionId: solicitud.params.id,
      ...solicitud.body,
    });

  anotarEnLote = (solicitud: FastifyRequest<{ Body: ConstanciasEnLoteSolicitadas }>) =>
    this.casosDeUso.anotarEnLote.ejecutar(operadorDe(solicitud), solicitud.body.constancias);

  quitar = (solicitud: FastifyRequest<{ Params: ParamsDeRetencion; Body: QuitarConstanciaSolicitado }>) =>
    this.casosDeUso.quitar.ejecutar(operadorDe(solicitud), {
      retencionId: solicitud.params.id,
      motivo: solicitud.body.motivo,
    });

  resolver = (solicitud: FastifyRequest<{ Params: ParamsDeRetencion; Body: ResolucionSolicitada }>) =>
    this.casosDeUso.resolver.ejecutar(operadorDe(solicitud), {
      retencionId: solicitud.params.id,
      ...solicitud.body,
    });

  porResolver = (solicitud: FastifyRequest<{ Querystring: PorResolverSolicitado }>) =>
    this.casosDeUso.porResolver.ejecutar(operadorDe(solicitud), solicitud.query.estado);
}
