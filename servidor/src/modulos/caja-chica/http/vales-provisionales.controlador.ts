import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularVale } from '../aplicacion/casos-uso/vales-provisionales/anular-vale.js';
import type { ListarVales, ObtenerVale } from '../aplicacion/casos-uso/vales-provisionales/consultas-de-vales.js';
import type { EntregarVale } from '../aplicacion/casos-uso/vales-provisionales/entregar-vale.js';
import type { LiquidarVale } from '../aplicacion/casos-uso/vales-provisionales/liquidar-vale.js';
import type { ParamsDeFondo } from './fondos.esquemas-http.js';
import type {
  AnularValeSolicitado,
  EntregarValeSolicitado,
  LiquidarValeSolicitado,
  ParamsDeVale,
} from './vales-provisionales.esquemas-http.js';

export interface CasosDeUsoDeVales {
  listar: ListarVales;
  obtener: ObtenerVale;
  entregar: EntregarVale;
  liquidar: LiquidarVale;
  anular: AnularVale;
}

const PERMISO_SOBRE_EL_TOPE = 'caja-chica.comprobantes.sobre-el-tope';
const PERMISO_CON_RETENCION = 'caja-chica.comprobantes.con-retencion';

const tiene = (solicitud: FastifyRequest, permiso: string): boolean =>
  solicitud.contexto?.permisos.has(permiso) ?? false;

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ValesProvisionalesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeVales) {}

  listar = (solicitud: FastifyRequest<{ Params: ParamsDeFondo }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.params.id);

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDeVale }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.id);

  entregar = async (
    solicitud: FastifyRequest<{ Params: ParamsDeFondo; Body: EntregarValeSolicitado }>,
    respuesta: FastifyReply,
  ) => {
    const vale = await this.casosDeUso.entregar.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      fondoId: solicitud.params.id,
    });
    return respuesta.status(201).send(vale);
  };

  liquidar = (solicitud: FastifyRequest<{ Params: ParamsDeVale; Body: LiquidarValeSolicitado }>) =>
    this.casosDeUso.liquidar.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      valeId: solicitud.params.id,
      permisos: {
        sobreElTope: tiene(solicitud, PERMISO_SOBRE_EL_TOPE),
        conRetencion: tiene(solicitud, PERMISO_CON_RETENCION),
      },
    });

  anular = (solicitud: FastifyRequest<{ Params: ParamsDeVale; Body: AnularValeSolicitado }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), { valeId: solicitud.params.id, ...solicitud.body });
}
