import type { FastifyReply, FastifyRequest } from 'fastify';
import { contextoDe } from '../../core/compartido/http/contexto-de-la-solicitud.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type {
  ListarDestinos,
  ObtenerDestinoSugerido,
} from '../aplicacion/casos-uso/documentos/consultas-del-formulario.js';
import type { PrevisualizarDocumento } from '../aplicacion/casos-uso/documentos/previsualizar-documento.js';
import type { PeticionDeRegistro, RegistrarDocumento } from '../aplicacion/casos-uso/documentos/registrar-documento.js';
import type { DocumentoSolicitado, ParamsDeProveedorDeDocumento } from './documentos.esquemas-http.js';

export interface CasosDeUsoDeDocumentos {
  previsualizar: PrevisualizarDocumento;
  registrar: RegistrarDocumento;
  destinoSugerido: ObtenerDestinoSugerido;
  destinos: ListarDestinos;
}

const PERMISO_DE_AJUSTAR = 'libro-de-compras.retenciones.ajustar';

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class DocumentosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeDocumentos) {}

  calcular = (solicitud: FastifyRequest<{ Body: DocumentoSolicitado }>) =>
    this.casosDeUso.previsualizar.ejecutar(operadorDe(solicitud), peticionDe(solicitud));

  registrar = async (solicitud: FastifyRequest<{ Body: DocumentoSolicitado }>, respuesta: FastifyReply) => {
    const registrado = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), peticionDe(solicitud));
    return respuesta.status(201).send(registrado);
  };

  destinoSugerido = (solicitud: FastifyRequest<{ Params: ParamsDeProveedorDeDocumento }>) =>
    this.casosDeUso.destinoSugerido.ejecutar(operadorDe(solicitud), solicitud.params.proveedorId);

  destinos = (solicitud: FastifyRequest) => this.casosDeUso.destinos.ejecutar(operadorDe(solicitud));
}

function peticionDe(solicitud: FastifyRequest<{ Body: DocumentoSolicitado }>): PeticionDeRegistro {
  return {
    solicitud: solicitud.body,
    puedeAjustarRetenciones: contextoDe(solicitud).permisos.has(PERMISO_DE_AJUSTAR),
  };
}
