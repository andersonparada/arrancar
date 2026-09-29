import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import { operadorParaAsignar } from '../../core/compartido/http/operador-para-asignar.js';
import type { ListarLocalidadesParaAsignar } from '../aplicacion/casos-uso/accesos/listar-localidades-para-asignar.js';
import type { ListarUsuariosDeLocalidad } from '../aplicacion/casos-uso/accesos/listar-usuarios-de-localidad.js';
import type { ListarUsuariosParaAccesos } from '../aplicacion/casos-uso/accesos/listar-usuarios-para-accesos.js';
import type { ObtenerAccesosDeUsuario } from '../aplicacion/casos-uso/accesos/obtener-accesos-de-usuario.js';
import type { ReemplazarAccesosDeUsuario } from '../aplicacion/casos-uso/accesos/reemplazar-accesos-de-usuario.js';
import type { AccesosDeUsuarioSolicitado, ParamsUsuarioDeAccesos } from './accesos-a-localidades.esquemas-http.js';
import type { ParamsLocalidad } from './localidades.esquemas-http.js';

export interface CasosDeUsoDeAccesos {
  listarLocalidades: ListarLocalidadesParaAsignar;
  listarUsuarios: ListarUsuariosParaAccesos;
  obtenerAccesos: ObtenerAccesosDeUsuario;
  reemplazarAccesos: ReemplazarAccesosDeUsuario;
  listarUsuariosDeLocalidad: ListarUsuariosDeLocalidad;
}

const RECURSO = 'empresas.localidades';
const paraAsignar = (solicitud: FastifyRequest) => operadorParaAsignar(solicitud, RECURSO);

/** Traduce las peticiones de la ventana de accesos; solo estas usan el operador «para asignar». */
export class AccesosALocalidadesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeAccesos) {}

  listarLocalidades = (solicitud: FastifyRequest) => this.casosDeUso.listarLocalidades.ejecutar(paraAsignar(solicitud));

  listarUsuarios = (solicitud: FastifyRequest) => this.casosDeUso.listarUsuarios.ejecutar(paraAsignar(solicitud));

  obtenerAccesos = (solicitud: FastifyRequest<{ Params: ParamsUsuarioDeAccesos }>) =>
    this.casosDeUso.obtenerAccesos.ejecutar(paraAsignar(solicitud), solicitud.params.usuarioId);

  reemplazarAccesos = async (
    solicitud: FastifyRequest<{ Params: ParamsUsuarioDeAccesos; Body: AccesosDeUsuarioSolicitado }>,
  ) => ({
    localidadIds: await this.casosDeUso.reemplazarAccesos.ejecutar(paraAsignar(solicitud), {
      usuarioId: solicitud.params.usuarioId,
      localidadIds: solicitud.body.localidadIds,
    }),
  });

  /** Para la ficha: con el operador normal, así solo se abre para localidades que el usuario ve. */
  usuariosDeLocalidad = (solicitud: FastifyRequest<{ Params: ParamsLocalidad }>) =>
    this.casosDeUso.listarUsuariosDeLocalidad.ejecutar(operadorDe(solicitud), solicitud.params.localidadId);
}
