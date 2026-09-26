import type { FastifyReply, FastifyRequest } from 'fastify';
import { contextoDe, empresaActivaDe } from '../http/contexto-solicitud.js';
import type { DestinoConfiguracion } from '../repositorios/configuraciones.repositorio.js';
import { configuracionServicio } from '../servicios/configuracion.servicio.js';
import type {
  ConsultaRestablecer,
  ParamsConfiguracion,
  ValorConfiguracion,
} from '../validaciones/configuracion.validaciones.js';

function destinoDe(solicitud: FastifyRequest): DestinoConfiguracion {
  const { cuentaId, empresaId } = empresaActivaDe(solicitud);
  return { cuentaId, empresaId };
}

export const configuracionControlador = {
  /** Solo las variables que la cuenta o la empresa pueden cambiar; las de instalación son de soporte. */
  async listar(solicitud: FastifyRequest) {
    const variables = await configuracionServicio.listar(destinoDe(solicitud), contextoDe(solicitud).modulosActivos);
    return variables.filter((v) => v.niveles.includes('cuenta') || v.niveles.includes('empresa'));
  },

  async establecer(
    solicitud: FastifyRequest<{ Params: ParamsConfiguracion; Body: ValorConfiguracion }>,
    respuesta: FastifyReply,
  ) {
    const contexto = contextoDe(solicitud);
    await configuracionServicio.establecer(
      destinoDe(solicitud),
      contexto.modulosActivos,
      solicitud.params.clave,
      solicitud.body.nivel,
      solicitud.body.valor,
      contexto.usuario.id,
    );
    return respuesta.status(204).send();
  },

  async restablecer(
    solicitud: FastifyRequest<{ Params: ParamsConfiguracion; Querystring: ConsultaRestablecer }>,
    respuesta: FastifyReply,
  ) {
    await configuracionServicio.restablecer(
      destinoDe(solicitud),
      contextoDe(solicitud).modulosActivos,
      solicitud.params.clave,
      solicitud.query.nivel,
    );
    return respuesta.status(204).send();
  },
};
