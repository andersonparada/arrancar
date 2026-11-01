import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularDocumento } from '../aplicacion/casos-uso/acciones/anular-documento.js';
import type { EliminarDocumento } from '../aplicacion/casos-uso/acciones/eliminar-documento.js';
import type { AnularDocumentoSolicitado } from './bajas.esquemas-http.js';
import type { ParamsDeDocumento } from './documentos.esquemas-http.js';

export interface CasosDeUsoDeBajas {
  anular: AnularDocumento;
  eliminar: EliminarDocumento;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class BajasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeBajas) {}

  anular = (solicitud: FastifyRequest<{ Params: ParamsDeDocumento; Body: AnularDocumentoSolicitado }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), { id: solicitud.params.documentoId, ...solicitud.body });

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsDeDocumento }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.documentoId);
    return respuesta.status(204).send();
  };
}
