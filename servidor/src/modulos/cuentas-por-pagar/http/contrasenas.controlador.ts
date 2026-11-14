import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AgregarDocumentosAContrasena } from '../aplicacion/casos-uso/contrasenas/agregar-documentos-a-contrasena.js';
import type { AnularContrasena } from '../aplicacion/casos-uso/contrasenas/anular-contrasena.js';
import type { CrearContrasena } from '../aplicacion/casos-uso/contrasenas/crear-contrasena.js';
import type { DocumentosDisponibles } from '../aplicacion/casos-uso/contrasenas/documentos-disponibles.js';
import type { ListarContrasenas } from '../aplicacion/casos-uso/contrasenas/listar-contrasenas.js';
import type { EditarContrasena } from '../aplicacion/casos-uso/contrasenas/editar-contrasena.js';
import type { ObtenerImpresionDeContrasena } from '../aplicacion/casos-uso/contrasenas/obtener-impresion-de-contrasena.js';
import type { ObtenerContrasena } from '../aplicacion/casos-uso/contrasenas/obtener-contrasena.js';
import type { RegistrarImpresion } from '../aplicacion/casos-uso/contrasenas/registrar-impresion.js';
import type { QuitarDocumentoDeContrasena } from '../aplicacion/casos-uso/contrasenas/quitar-documento-de-contrasena.js';
import type {
  AnularContrasenaSolicitada,
  ContrasenaSolicitada,
  DisponiblesSolicitado,
  DocumentosAgregadosSolicitados,
  EdicionDeContrasenaSolicitada,
  FiltroDeContrasenasSolicitado,
  ParamsDeContrasena,
  ParamsDeDocumentoDeContrasena,
  QuitarDocumentoSolicitado,
} from './contrasenas.esquemas-http.js';

export interface CasosDeUsoDeContrasenas {
  listar: ListarContrasenas;
  obtener: ObtenerContrasena;
  disponibles: DocumentosDisponibles;
  crear: CrearContrasena;
  editar: EditarContrasena;
  agregarDocumentos: AgregarDocumentosAContrasena;
  quitarDocumento: QuitarDocumentoDeContrasena;
  anular: AnularContrasena;
  verImpresion: ObtenerImpresionDeContrasena;
  registrarImpresion: RegistrarImpresion;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ContrasenasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeContrasenas) {}

  listar = (solicitud: FastifyRequest<{ Querystring: FiltroDeContrasenasSolicitado }>) => {
    const { pagina, limite, ...filtro } = solicitud.query;
    return this.casosDeUso.listar.ejecutar(operadorDe(solicitud), filtro, { pagina, limite });
  };

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDeContrasena }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.id);

  verImpresion = (solicitud: FastifyRequest<{ Params: ParamsDeContrasena }>) =>
    this.casosDeUso.verImpresion.ejecutar(operadorDe(solicitud), solicitud.params.id);

  registrarImpresion = (solicitud: FastifyRequest<{ Params: ParamsDeContrasena }>) =>
    this.casosDeUso.registrarImpresion.ejecutar(operadorDe(solicitud), solicitud.params.id);

  disponibles = (solicitud: FastifyRequest<{ Querystring: DisponiblesSolicitado }>) =>
    this.casosDeUso.disponibles.ejecutar(operadorDe(solicitud), solicitud.query.proveedorId);

  crear = async (solicitud: FastifyRequest<{ Body: ContrasenaSolicitada }>, respuesta: FastifyReply) => {
    const contrasena = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(contrasena);
  };

  editar = (solicitud: FastifyRequest<{ Params: ParamsDeContrasena; Body: EdicionDeContrasenaSolicitada }>) =>
    this.casosDeUso.editar.ejecutar(operadorDe(solicitud), { id: solicitud.params.id, ...solicitud.body });

  agregarDocumentos = (
    solicitud: FastifyRequest<{ Params: ParamsDeContrasena; Body: DocumentosAgregadosSolicitados }>,
  ) =>
    this.casosDeUso.agregarDocumentos.ejecutar(operadorDe(solicitud), {
      contrasenaId: solicitud.params.id,
      documentos: solicitud.body.documentos,
    });

  anular = (solicitud: FastifyRequest<{ Params: ParamsDeContrasena; Body: AnularContrasenaSolicitada }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), { id: solicitud.params.id, motivo: solicitud.body.motivo });

  quitarDocumento = (
    solicitud: FastifyRequest<{ Params: ParamsDeDocumentoDeContrasena; Body: QuitarDocumentoSolicitado }>,
  ) =>
    this.casosDeUso.quitarDocumento.ejecutar(operadorDe(solicitud), {
      contrasenaId: solicitud.params.id,
      documentoId: solicitud.params.documentoId,
      motivo: solicitud.body.motivo,
    });
}
