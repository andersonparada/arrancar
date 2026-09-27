import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AsignarPapel } from '../aplicacion/casos-uso/papeles/asignar-papel.js';
import type { QuitarPapel } from '../aplicacion/casos-uso/papeles/quitar-papel.js';
import type { ActualizarTercero } from '../aplicacion/casos-uso/terceros/actualizar-tercero.js';
import type { ListarTerceros } from '../aplicacion/casos-uso/terceros/listar-terceros.js';
import type { ObtenerFichaDeTercero } from '../aplicacion/casos-uso/terceros/obtener-ficha-de-tercero.js';
import type { RegistrarTercero } from '../aplicacion/casos-uso/terceros/registrar-tercero.js';
import type {
  AltaDeTerceroSolicitada,
  FiltrosSolicitados,
  PapelDeClienteSolicitado,
  PapelDeProveedorSolicitado,
  ParamsTercero,
  TerceroSolicitado,
} from './terceros.esquemas-http.js';

export interface CasosDeUsoDeTerceros {
  listar: ListarTerceros;
  obtenerFicha: ObtenerFichaDeTercero;
  registrar: RegistrarTercero;
  actualizar: ActualizarTercero;
  asignarPapel: AsignarPapel;
  quitarPapel: QuitarPapel;
}

type ConTercero<Cuerpo = unknown> = FastifyRequest<{ Params: ParamsTercero; Body: Cuerpo }>;

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class TercerosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeTerceros) {}

  listar = (solicitud: FastifyRequest<{ Querystring: FiltrosSolicitados }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.query);

  obtenerFicha = (solicitud: ConTercero) =>
    this.casosDeUso.obtenerFicha.ejecutar(operadorDe(solicitud), solicitud.params.terceroId);

  registrar = async (solicitud: FastifyRequest<{ Body: AltaDeTerceroSolicitada }>, respuesta: FastifyReply) => {
    const tercero = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(tercero);
  };

  actualizar = (solicitud: ConTercero<TerceroSolicitado>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      terceroId: solicitud.params.terceroId,
      solicitud: solicitud.body,
    });

  asignarCliente = (solicitud: ConTercero<PapelDeClienteSolicitado>) =>
    this.casosDeUso.asignarPapel.ejecutar(operadorDe(solicitud), {
      terceroId: solicitud.params.terceroId,
      papel: { tipo: 'cliente', ...solicitud.body },
    });

  asignarProveedor = (solicitud: ConTercero<PapelDeProveedorSolicitado>) =>
    this.casosDeUso.asignarPapel.ejecutar(operadorDe(solicitud), {
      terceroId: solicitud.params.terceroId,
      papel: { tipo: 'proveedor', ...solicitud.body },
    });

  quitarCliente = (solicitud: ConTercero, respuesta: FastifyReply) => this.quitar('cliente', solicitud, respuesta);

  quitarProveedor = (solicitud: ConTercero, respuesta: FastifyReply) => this.quitar('proveedor', solicitud, respuesta);

  private async quitar(tipo: 'cliente' | 'proveedor', solicitud: ConTercero, respuesta: FastifyReply) {
    await this.casosDeUso.quitarPapel.ejecutar(operadorDe(solicitud), { terceroId: solicitud.params.terceroId, tipo });
    return respuesta.status(204).send();
  }
}
