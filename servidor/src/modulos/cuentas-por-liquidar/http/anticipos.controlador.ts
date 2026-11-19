import type { FastifyReply, FastifyRequest } from 'fastify';
import { contextoDe } from '../../core/compartido/http/contexto-de-la-solicitud.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularAnticipo } from '../aplicacion/casos-uso/anticipos/anular-anticipo.js';
import type { ListarAnticipos, ObtenerAnticipo } from '../aplicacion/casos-uso/anticipos/consultas-de-anticipos.js';
import type { EntregarAnticipo } from '../aplicacion/casos-uso/anticipos/entregar-anticipo.js';
import type {
  AnticipoSolicitado,
  AnularAnticipoSolicitado,
  ListaDeAnticiposSolicitada,
  ParamsDeAnticipo,
} from './anticipos.esquemas-http.js';

const PERMISO_CON_VENCIDOS = 'cuentas-por-liquidar.anticipos.con-vencidos';

export interface CasosDeUsoDeAnticipos {
  entregar: EntregarAnticipo;
  listar: ListarAnticipos;
  obtener: ObtenerAnticipo;
  anular: AnularAnticipo;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class AnticiposControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeAnticipos) {}

  entregar = async (solicitud: FastifyRequest<{ Body: AnticipoSolicitado }>, respuesta: FastifyReply) => {
    const puedeConVencidos = contextoDe(solicitud).permisos.has(PERMISO_CON_VENCIDOS);
    const anticipo = await this.casosDeUso.entregar.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      puedeConVencidos,
    });
    return respuesta.status(201).send(anticipo);
  };

  listar = (solicitud: FastifyRequest<{ Querystring: ListaDeAnticiposSolicitada }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.query);

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDeAnticipo }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.id);

  anular = (solicitud: FastifyRequest<{ Params: ParamsDeAnticipo; Body: AnularAnticipoSolicitado }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), { anticipoId: solicitud.params.id, ...solicitud.body });
}
