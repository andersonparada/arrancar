import type { FastifyReply, FastifyRequest } from 'fastify';
import { aCentavos } from '../../core/compartido/dominio/centavos.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularCosto } from '../aplicacion/casos-uso/costos/anular-costo.js';
import type { ListarCostosDeActivo } from '../aplicacion/casos-uso/costos/listar-costos-de-activo.js';
import type { RegistrarCostoManual } from '../aplicacion/casos-uso/costos/registrar-costo-manual.js';
import type { ParamsActivo } from './activos.esquemas-http.js';
import type { AnulacionDeCostoSolicitada, CostoManualSolicitado, ParamsCosto } from './costos.esquemas-http.js';

export interface CasosDeUsoDeCostos {
  listar: ListarCostosDeActivo;
  registrarManual: RegistrarCostoManual;
  anular: AnularCosto;
}

/** Traduce las peticiones HTTP de los costos a casos de uso; no contiene reglas de negocio. */
export class CostosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeCostos) {}

  listar = (solicitud: FastifyRequest<{ Params: ParamsActivo }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.params.activoId);

  registrarManual = async (
    solicitud: FastifyRequest<{ Params: ParamsActivo; Body: CostoManualSolicitado }>,
    respuesta: FastifyReply,
  ) => {
    const { monto, ...resto } = solicitud.body;
    const costo = await this.casosDeUso.registrarManual.ejecutar(operadorDe(solicitud), {
      activoId: solicitud.params.activoId,
      solicitud: { ...resto, montoCentavos: aCentavos(monto) },
    });
    return respuesta.status(201).send(costo);
  };

  anular = (solicitud: FastifyRequest<{ Params: ParamsCosto; Body: AnulacionDeCostoSolicitada }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      costoId: solicitud.params.costoId,
      motivo: solicitud.body.motivo,
    });
}
