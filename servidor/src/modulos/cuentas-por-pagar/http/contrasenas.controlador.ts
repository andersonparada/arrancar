import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { CrearContrasena } from '../aplicacion/casos-uso/contrasenas/crear-contrasena.js';
import type { DocumentosDisponibles } from '../aplicacion/casos-uso/contrasenas/documentos-disponibles.js';
import type { ListarContrasenas } from '../aplicacion/casos-uso/contrasenas/listar-contrasenas.js';
import type { ObtenerContrasena } from '../aplicacion/casos-uso/contrasenas/obtener-contrasena.js';
import type {
  ContrasenaSolicitada,
  DisponiblesSolicitado,
  FiltroDeContrasenasSolicitado,
  ParamsDeContrasena,
} from './contrasenas.esquemas-http.js';

export interface CasosDeUsoDeContrasenas {
  listar: ListarContrasenas;
  obtener: ObtenerContrasena;
  disponibles: DocumentosDisponibles;
  crear: CrearContrasena;
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

  disponibles = (solicitud: FastifyRequest<{ Querystring: DisponiblesSolicitado }>) =>
    this.casosDeUso.disponibles.ejecutar(operadorDe(solicitud), solicitud.query.proveedorId);

  crear = async (solicitud: FastifyRequest<{ Body: ContrasenaSolicitada }>, respuesta: FastifyReply) => {
    const contrasena = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(contrasena);
  };
}
