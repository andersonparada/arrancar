import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import { operadorParaAsignar } from '../../core/compartido/http/operador-para-asignar.js';
import type { ListarBodegasParaAsignar } from '../aplicacion/casos-uso/accesos/listar-bodegas-para-asignar.js';
import type { ListarUsuariosDeBodega } from '../aplicacion/casos-uso/accesos/listar-usuarios-de-bodega.js';
import type { ListarUsuariosParaAccesos } from '../aplicacion/casos-uso/accesos/listar-usuarios-para-accesos.js';
import type { ObtenerAccesosDeUsuario } from '../aplicacion/casos-uso/accesos/obtener-accesos-de-usuario.js';
import type { ReemplazarAccesosDeUsuario } from '../aplicacion/casos-uso/accesos/reemplazar-accesos-de-usuario.js';
import type { AccesosDeUsuarioSolicitado, ParamsUsuarioDeAccesos } from './accesos-a-bodegas.esquemas-http.js';
import type { ParamsBodega } from './bodegas.esquemas-http.js';

export interface CasosDeUsoDeAccesos {
  listarBodegas: ListarBodegasParaAsignar;
  listarUsuarios: ListarUsuariosParaAccesos;
  obtenerAccesos: ObtenerAccesosDeUsuario;
  reemplazarAccesos: ReemplazarAccesosDeUsuario;
  listarUsuariosDeBodega: ListarUsuariosDeBodega;
}

const RECURSO = 'inventarios.bodegas';
const paraAsignar = (solicitud: FastifyRequest) => operadorParaAsignar(solicitud, RECURSO);

/** Traduce las peticiones de la ventana de accesos; solo estas usan el operador «para asignar». */
export class AccesosABodegasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeAccesos) {}

  listarBodegas = (solicitud: FastifyRequest) => this.casosDeUso.listarBodegas.ejecutar(paraAsignar(solicitud));

  listarUsuarios = (solicitud: FastifyRequest) => this.casosDeUso.listarUsuarios.ejecutar(paraAsignar(solicitud));

  obtenerAccesos = (solicitud: FastifyRequest<{ Params: ParamsUsuarioDeAccesos }>) =>
    this.casosDeUso.obtenerAccesos.ejecutar(paraAsignar(solicitud), solicitud.params.usuarioId);

  reemplazarAccesos = async (
    solicitud: FastifyRequest<{ Params: ParamsUsuarioDeAccesos; Body: AccesosDeUsuarioSolicitado }>,
  ) => ({
    bodegaIds: await this.casosDeUso.reemplazarAccesos.ejecutar(paraAsignar(solicitud), {
      usuarioId: solicitud.params.usuarioId,
      bodegaIds: solicitud.body.bodegaIds,
    }),
  });

  /** Para la ficha: con el operador normal, así solo se abre para bodegas que el usuario ve. */
  usuariosDeBodega = (solicitud: FastifyRequest<{ Params: ParamsBodega }>) =>
    this.casosDeUso.listarUsuariosDeBodega.ejecutar(operadorDe(solicitud), solicitud.params.bodegaId);
}
