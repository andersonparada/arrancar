import type { FastifyReply, FastifyRequest } from 'fastify';
import { aCentavos } from '../../core/compartido/dominio/centavos.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularMejora } from '../aplicacion/casos-uso/mejoras/anular-mejora.js';
import type { CambiarValorFiscalDelInmueble } from '../aplicacion/casos-uso/mejoras/cambiar-valor-fiscal.js';
import type { ListarMejorasDeActivo } from '../aplicacion/casos-uso/mejoras/listar-mejoras-de-activo.js';
import type { RegistrarMejora } from '../aplicacion/casos-uso/mejoras/registrar-mejora.js';
import type { RevisarEstimacion } from '../aplicacion/casos-uso/mejoras/revisar-estimacion.js';
import type { SolicitudDeMejora } from '../aplicacion/dto/mejora.dto.js';
import type { ParamsActivo } from './activos.esquemas-http.js';
import type {
  AnulacionDeMejoraSolicitada,
  MejoraSolicitada,
  ParamsMejora,
  RevisionDeEstimacionSolicitada,
  ValorFiscalDelInmuebleSolicitado,
} from './mejoras.esquemas-http.js';

export interface CasosDeUsoDeMejoras {
  listar: ListarMejorasDeActivo;
  registrar: RegistrarMejora;
  anular: AnularMejora;
  revisarEstimacion: RevisarEstimacion;
  cambiarValorFiscal: CambiarValorFiscalDelInmueble;
}

/** Los montos llegan como texto con dos decimales y los casos de uso trabajan en centavos enteros. */
function aSolicitud({ activoId: _activoId, lineas, costosManuales, ...datos }: MejoraSolicitada): SolicitudDeMejora {
  return {
    ...datos,
    lineas: lineas.map(({ monto, ...resto }) => ({ ...resto, montoCentavos: aCentavos(monto) })),
    costosManuales: costosManuales.map(({ monto, ...resto }) => ({ ...resto, montoCentavos: aCentavos(monto) })),
  };
}

/** Traduce las peticiones HTTP de las mejoras y las revisiones a casos de uso; no contiene reglas de negocio. */
export class MejorasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeMejoras) {}

  listar = (solicitud: FastifyRequest<{ Params: ParamsActivo }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.params.activoId);

  registrar = async (solicitud: FastifyRequest<{ Body: MejoraSolicitada }>, respuesta: FastifyReply) => {
    const mejora = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), {
      activoId: solicitud.body.activoId,
      solicitud: aSolicitud(solicitud.body),
    });
    return respuesta.status(201).send(mejora);
  };

  anular = (solicitud: FastifyRequest<{ Params: ParamsMejora; Body: AnulacionDeMejoraSolicitada }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      mejoraId: solicitud.params.mejoraId,
      motivo: solicitud.body.motivo,
    });

  revisarEstimacion = (solicitud: FastifyRequest<{ Params: ParamsActivo; Body: RevisionDeEstimacionSolicitada }>) =>
    this.casosDeUso.revisarEstimacion.ejecutar(operadorDe(solicitud), {
      activoId: solicitud.params.activoId,
      solicitud: solicitud.body,
    });

  cambiarValorFiscal = (solicitud: FastifyRequest<{ Params: ParamsActivo; Body: ValorFiscalDelInmuebleSolicitado }>) =>
    this.casosDeUso.cambiarValorFiscal.ejecutar(operadorDe(solicitud), {
      activoId: solicitud.params.activoId,
      solicitud: solicitud.body,
    });
}
