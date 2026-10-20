import type { FastifyReply, FastifyRequest } from 'fastify';
import { contextoDe } from '../../core/compartido/http/contexto-de-la-solicitud.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type {
  ListarDestinos,
  ObtenerDestinoSugerido,
} from '../aplicacion/casos-uso/documentos/consultas-del-formulario.js';
import { destinoConocido } from '../dominio/destinos-de-documento.js';
import type { AnularDocumento } from '../aplicacion/casos-uso/documentos/anular-documento.js';
import type { ListarDocumentos, ObtenerDocumento } from '../aplicacion/casos-uso/documentos/consultar-documentos.js';
import type { EliminarDocumento } from '../aplicacion/casos-uso/documentos/eliminar-documento.js';
import type { PrevisualizarDocumento } from '../aplicacion/casos-uso/documentos/previsualizar-documento.js';
import type { PeticionDeRegistro, RegistrarDocumento } from '../aplicacion/casos-uso/documentos/registrar-documento.js';
import type {
  AnulacionDeDocumentoSolicitada,
  FiltroDeDocumentosSolicitado,
  ParamsDeDocumento,
} from './documentos.bajas.esquemas-http.js';
import type {
  DocumentoParaCalcular,
  DocumentoSolicitado,
  ParamsDeProveedorDeDocumento,
} from './documentos.esquemas-http.js';

export interface CasosDeUsoDeDocumentos {
  previsualizar: PrevisualizarDocumento;
  registrar: RegistrarDocumento;
  destinoSugerido: ObtenerDestinoSugerido;
  destinos: ListarDestinos;
  listar: ListarDocumentos;
  obtener: ObtenerDocumento;
  anular: AnularDocumento;
  eliminar: EliminarDocumento;
}

const PERMISO_DE_AJUSTAR = 'libro-de-compras.retenciones.ajustar';

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class DocumentosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeDocumentos) {}

  calcular = (solicitud: FastifyRequest<{ Body: DocumentoParaCalcular }>) =>
    this.casosDeUso.previsualizar.ejecutar(operadorDe(solicitud), peticionDeCalculo(solicitud));

  registrar = async (solicitud: FastifyRequest<{ Body: DocumentoSolicitado }>, respuesta: FastifyReply) => {
    const registrado = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), peticionDe(solicitud));
    return respuesta.status(201).send(registrado);
  };

  destinoSugerido = (solicitud: FastifyRequest<{ Params: ParamsDeProveedorDeDocumento }>) =>
    this.casosDeUso.destinoSugerido.ejecutar(operadorDe(solicitud), solicitud.params.proveedorId);

  destinos = (solicitud: FastifyRequest) => this.casosDeUso.destinos.ejecutar(operadorDe(solicitud));

  listar = (solicitud: FastifyRequest<{ Querystring: FiltroDeDocumentosSolicitado }>) => {
    const { pagina, limite, ...filtro } = solicitud.query;
    return this.casosDeUso.listar.ejecutar(operadorDe(solicitud), filtro, { pagina, limite });
  };

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDeDocumento }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.documentoId);

  anular = (solicitud: FastifyRequest<{ Params: ParamsDeDocumento; Body: AnulacionDeDocumentoSolicitada }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      documentoId: solicitud.params.documentoId,
      causa: solicitud.body.causa,
      motivo: solicitud.body.motivo,
    });

  /** Responde 200 con `{ avisos }` (no 204) para poder avisar que el período puede estar declarado. */
  eliminar = (solicitud: FastifyRequest<{ Params: ParamsDeDocumento }>) =>
    this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), { documentoId: solicitud.params.documentoId });
}

/** Al calcular, un destino vacío o desconocido llega como `null`: la vista previa no lo necesita. */
function peticionDeCalculo(solicitud: FastifyRequest<{ Body: DocumentoParaCalcular }>): PeticionDeRegistro {
  const permisos = contextoDe(solicitud).permisos;
  return {
    solicitud: { ...solicitud.body, destino: destinoConocido(solicitud.body.destino) },
    puedeAjustarRetenciones: permisos.has(PERMISO_DE_AJUSTAR),
  };
}

function peticionDe(solicitud: FastifyRequest<{ Body: DocumentoSolicitado }>): PeticionDeRegistro {
  return {
    solicitud: solicitud.body,
    puedeAjustarRetenciones: contextoDe(solicitud).permisos.has(PERMISO_DE_AJUSTAR),
  };
}
