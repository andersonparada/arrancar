import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularDocumentoDeVenta } from '../aplicacion/casos-uso/documentos/anular-documento-de-venta.js';
import type {
  ListarDocumentosDeVenta,
  ObtenerDocumentoDeVenta,
} from '../aplicacion/casos-uso/documentos/consultar-documentos-de-venta.js';
import type { EliminarDocumentoDeVenta } from '../aplicacion/casos-uso/documentos/eliminar-documento-de-venta.js';
import type { RegistrarDocumentoDeVenta } from '../aplicacion/casos-uso/documentos/registrar-documento-de-venta.js';
import type {
  AnulacionDeDocumentoSolicitada,
  DocumentoSolicitado,
  FiltroDeDocumentosSolicitado,
  ParamsDeDocumento,
} from './documentos.esquemas-http.js';

export interface CasosDeUsoDeDocumentos {
  registrar: RegistrarDocumentoDeVenta;
  listar: ListarDocumentosDeVenta;
  obtener: ObtenerDocumentoDeVenta;
  anular: AnularDocumentoDeVenta;
  eliminar: EliminarDocumentoDeVenta;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class DocumentosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeDocumentos) {}

  registrar = async (solicitud: FastifyRequest<{ Body: DocumentoSolicitado }>, respuesta: FastifyReply) => {
    const registrado = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(registrado);
  };

  listar = (solicitud: FastifyRequest<{ Querystring: FiltroDeDocumentosSolicitado }>) => {
    const { pagina, limite, ...filtro } = solicitud.query;
    return this.casosDeUso.listar.ejecutar(operadorDe(solicitud), filtro, { pagina, limite });
  };

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDeDocumento }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.documentoId);

  anular = (solicitud: FastifyRequest<{ Params: ParamsDeDocumento; Body: AnulacionDeDocumentoSolicitada }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      documentoId: solicitud.params.documentoId,
      ...solicitud.body,
    });

  /** Responde 200 con `{ avisos }` (no 204) para poder avisar que el período puede estar declarado. */
  eliminar = (solicitud: FastifyRequest<{ Params: ParamsDeDocumento }>) =>
    this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.documentoId);
}
