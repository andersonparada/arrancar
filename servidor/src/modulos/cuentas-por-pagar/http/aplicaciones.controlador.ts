import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AplicarNota } from '../aplicacion/casos-uso/aplicaciones/aplicar-nota.js';
import type { ListarCargosParaAplicar } from '../aplicacion/casos-uso/aplicaciones/listar-cargos-para-aplicar.js';
import type { QuitarAplicacion } from '../aplicacion/casos-uso/aplicaciones/quitar-aplicacion.js';
import type {
  AplicarNotaSolicitado,
  ParamsDeAplicacion,
  QuitarAplicacionSolicitado,
} from './aplicaciones.esquemas-http.js';
import type { ParamsDeDocumento } from './documentos.esquemas-http.js';

export interface CasosDeUsoDeAplicaciones {
  listarCargos: ListarCargosParaAplicar;
  aplicar: AplicarNota;
  quitar: QuitarAplicacion;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class AplicacionesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeAplicaciones) {}

  cargosParaAplicar = (solicitud: FastifyRequest<{ Params: ParamsDeDocumento }>) =>
    this.casosDeUso.listarCargos.ejecutar(operadorDe(solicitud), solicitud.params.documentoId);

  aplicar = (solicitud: FastifyRequest<{ Params: ParamsDeDocumento; Body: AplicarNotaSolicitado }>) =>
    this.casosDeUso.aplicar.ejecutar(operadorDe(solicitud), {
      notaId: solicitud.params.documentoId,
      ...solicitud.body,
    });

  quitar = async (
    solicitud: FastifyRequest<{ Params: ParamsDeAplicacion; Body: QuitarAplicacionSolicitado }>,
    respuesta: FastifyReply,
  ) => {
    await this.casosDeUso.quitar.ejecutar(operadorDe(solicitud), {
      aplicacionId: solicitud.params.aplicacionId,
      motivo: solicitud.body.motivo,
    });
    return respuesta.status(204).send();
  };
}
