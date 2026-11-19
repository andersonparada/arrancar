import type { FastifyRequest } from 'fastify';
import { operadorParaAsignar } from '../../core/compartido/http/operador-para-asignar.js';
import {
  type ListarFondosParaAsignar,
  type ListarUsuariosParaAccesos,
  type ObtenerAccesosDeUsuario,
} from '../aplicacion/casos-uso/accesos/accesos-a-fondos.js';
import type { ReemplazarAccesosDeUsuario } from '../aplicacion/casos-uso/accesos/reemplazar-accesos-de-usuario.js';
import type { AccesosDeUsuarioSolicitado, ParamsUsuarioDeAccesos } from './accesos-a-fondos.esquemas-http.js';

export interface CasosDeUsoDeAccesos {
  listarFondos: ListarFondosParaAsignar;
  listarUsuarios: ListarUsuariosParaAccesos;
  obtenerAccesos: ObtenerAccesosDeUsuario;
  reemplazarAccesos: ReemplazarAccesosDeUsuario;
}

const RECURSO = 'caja-chica.fondos';
const paraAsignar = (solicitud: FastifyRequest) => operadorParaAsignar(solicitud, RECURSO);

/** Traduce las peticiones de la ventana de accesos; solo estas usan el operador «para asignar». */
export class AccesosAFondosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeAccesos) {}

  listarFondos = (solicitud: FastifyRequest) => this.casosDeUso.listarFondos.ejecutar(paraAsignar(solicitud));

  listarUsuarios = (solicitud: FastifyRequest) => this.casosDeUso.listarUsuarios.ejecutar(paraAsignar(solicitud));

  obtenerAccesos = (solicitud: FastifyRequest<{ Params: ParamsUsuarioDeAccesos }>) =>
    this.casosDeUso.obtenerAccesos.ejecutar(paraAsignar(solicitud), solicitud.params.usuarioId);

  reemplazarAccesos = async (
    solicitud: FastifyRequest<{ Params: ParamsUsuarioDeAccesos; Body: AccesosDeUsuarioSolicitado }>,
  ) => ({
    fondoIds: await this.casosDeUso.reemplazarAccesos.ejecutar(paraAsignar(solicitud), {
      usuarioId: solicitud.params.usuarioId,
      fondoIds: solicitud.body.fondoIds,
    }),
  });
}
