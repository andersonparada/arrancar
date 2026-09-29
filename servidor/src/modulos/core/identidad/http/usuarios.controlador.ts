import type { FastifyReply, FastifyRequest } from 'fastify';
import { contextoDe } from '../../compartido/http/contexto-de-la-solicitud.js';
import { operadorDe } from '../../compartido/http/operador-de-la-solicitud.js';
import type { ActualizarUsuario } from '../aplicacion/casos-uso/actualizar-usuario.js';
import type { AsignarPermisosAUsuario } from '../aplicacion/casos-uso/asignar-permisos-a-usuario.js';
import type { CambiarContrasena } from '../aplicacion/casos-uso/cambiar-contrasena.js';
import type { CrearUsuario } from '../aplicacion/casos-uso/crear-usuario.js';
import type { ListarUsuarios } from '../aplicacion/casos-uso/listar-usuarios.js';
import type { ObtenerPermisosDeUsuario } from '../aplicacion/casos-uso/obtener-permisos-de-usuario.js';
import type { SugerirNombreDeUsuario } from '../aplicacion/casos-uso/sugerir-nombre-de-usuario.js';
import type {
  AsignacionesSolicitadas,
  CambioContrasena,
  CambioUsuario,
  NuevoUsuarioSolicitado,
  ParamsUsuario,
  SugerenciaUsuario,
} from './usuarios.esquemas-http.js';

export interface CasosDeUsoDeUsuarios {
  listar: ListarUsuarios;
  sugerirNombre: SugerirNombreDeUsuario;
  crear: CrearUsuario;
  actualizar: ActualizarUsuario;
  cambiarContrasena: CambiarContrasena;
  obtenerPermisos: ObtenerPermisosDeUsuario;
  asignarPermisos: AsignarPermisosAUsuario;
}

type ConUsuario<Cuerpo> = FastifyRequest<{ Params: ParamsUsuario; Body: Cuerpo }>;

export class UsuariosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeUsuarios) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  sugerirNombre = (solicitud: FastifyRequest<{ Querystring: SugerenciaUsuario }>) =>
    this.casosDeUso.sugerirNombre.ejecutar(operadorDe(solicitud), solicitud.query.nombres, solicitud.query.apellidos);

  crear = async (solicitud: FastifyRequest<{ Body: NuevoUsuarioSolicitado }>, respuesta: FastifyReply) => {
    const puedeAsignarPermisos = contextoDe(solicitud).permisos.has('usuarios.asignar-permisos');
    const creado = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      puedeAsignarPermisos,
    });
    return respuesta.status(201).send(creado);
  };

  actualizar = async (solicitud: ConUsuario<CambioUsuario>, respuesta: FastifyReply) => {
    await this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      usuarioId: solicitud.params.usuarioId,
      solicitud: solicitud.body,
    });
    return respuesta.status(204).send();
  };

  cambiarContrasena = async (solicitud: ConUsuario<CambioContrasena>, respuesta: FastifyReply) => {
    await this.casosDeUso.cambiarContrasena.ejecutar(operadorDe(solicitud), {
      usuarioId: solicitud.params.usuarioId,
      contrasena: solicitud.body.contrasena,
      contrasenaActual: solicitud.body.contrasenaActual,
    });
    return respuesta.status(204).send();
  };

  permisos = (solicitud: FastifyRequest<{ Params: ParamsUsuario }>) =>
    this.casosDeUso.obtenerPermisos.ejecutar(operadorDe(solicitud), solicitud.params.usuarioId);

  asignarPermisos = async (solicitud: ConUsuario<AsignacionesSolicitadas>, respuesta: FastifyReply) => {
    await this.casosDeUso.asignarPermisos.ejecutar(operadorDe(solicitud), {
      usuarioId: solicitud.params.usuarioId,
      solicitud: solicitud.body,
    });
    return respuesta.status(204).send();
  };
}
