import type { FastifyReply, FastifyRequest } from 'fastify';
import { contextoDe, empresaActivaDe } from '../../compartido/http/contexto-de-la-solicitud.js';
import type { EstablecerValor } from '../aplicacion/casos-uso/establecer-valor.js';
import type { ListarVariablesEditables } from '../aplicacion/casos-uso/listar-variables-editables.js';
import type { RestablecerValor } from '../aplicacion/casos-uso/restablecer-valor.js';
import type { Alcance } from '../aplicacion/dto/variable.dto.js';
import type { ConsultaRestablecer, ParamsConfiguracion, ValorConfiguracion } from './configuracion.esquemas-http.js';

export interface CasosDeUsoDeConfiguracion {
  listar: ListarVariablesEditables;
  establecer: EstablecerValor;
  restablecer: RestablecerValor;
}

/** La cuenta y la empresa activas, con los módulos que tiene contratados la cuenta. */
function alcanceDe(solicitud: FastifyRequest): Alcance {
  const { cuentaId, empresaId } = empresaActivaDe(solicitud);
  return { destino: { cuentaId, empresaId }, modulosActivos: contextoDe(solicitud).modulosActivos };
}

export class ConfiguracionControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeConfiguracion) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(alcanceDe(solicitud));

  establecer = async (
    solicitud: FastifyRequest<{ Params: ParamsConfiguracion; Body: ValorConfiguracion }>,
    respuesta: FastifyReply,
  ) => {
    await this.casosDeUso.establecer.ejecutar({
      ...alcanceDe(solicitud),
      ...solicitud.body,
      clave: solicitud.params.clave,
      usuarioId: contextoDe(solicitud).usuario.id,
    });
    return respuesta.status(204).send();
  };

  restablecer = async (
    solicitud: FastifyRequest<{ Params: ParamsConfiguracion; Querystring: ConsultaRestablecer }>,
    respuesta: FastifyReply,
  ) => {
    await this.casosDeUso.restablecer.ejecutar({
      ...alcanceDe(solicitud),
      clave: solicitud.params.clave,
      nivel: solicitud.query.nivel,
    });
    return respuesta.status(204).send();
  };
}
