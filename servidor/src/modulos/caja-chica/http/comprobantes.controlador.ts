import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularComprobante } from '../aplicacion/casos-uso/comprobantes/anular-comprobante.js';
import type { AsignarDocumentos } from '../aplicacion/casos-uso/comprobantes/asignar-documentos.js';
import type {
  ListarBandeja,
  ListarComprobantesDelFondo,
} from '../aplicacion/casos-uso/comprobantes/consultas-de-comprobantes.js';
import type { DevolverALaBandeja } from '../aplicacion/casos-uso/comprobantes/devolver-a-la-bandeja.js';
import type { RegistrarValeDeGasto } from '../aplicacion/casos-uso/comprobantes/registrar-vale-de-gasto.js';
import type {
  AsignarDocumentosSolicitado,
  BandejaSolicitada,
  ComprobantesDelFondoSolicitados,
  ConMotivoSolicitado,
  ParamsDeComprobante,
  ValeDeGastoSolicitado,
} from './comprobantes.esquemas-http.js';
import type { ParamsDeFondo } from './fondos.esquemas-http.js';

export interface CasosDeUsoDeComprobantes {
  bandeja: ListarBandeja;
  delFondo: ListarComprobantesDelFondo;
  asignar: AsignarDocumentos;
  devolver: DevolverALaBandeja;
  registrarVale: RegistrarValeDeGasto;
  anular: AnularComprobante;
}

const PERMISO_SOBRE_EL_TOPE = 'caja-chica.comprobantes.sobre-el-tope';
const PERMISO_CON_RETENCION = 'caja-chica.comprobantes.con-retencion';

const tiene = (solicitud: FastifyRequest, permiso: string): boolean =>
  solicitud.contexto?.permisos.has(permiso) ?? false;

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ComprobantesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeComprobantes) {}

  bandeja = (solicitud: FastifyRequest<{ Querystring: BandejaSolicitada }>) =>
    this.casosDeUso.bandeja.ejecutar(operadorDe(solicitud), {
      ...solicitud.query,
      puedeAsignarConRetencion: tiene(solicitud, PERMISO_CON_RETENCION),
    });

  delFondo = (solicitud: FastifyRequest<{ Params: ParamsDeFondo; Querystring: ComprobantesDelFondoSolicitados }>) =>
    this.casosDeUso.delFondo.ejecutar(operadorDe(solicitud), {
      fondoId: solicitud.params.id,
      estado: solicitud.query.estado,
    });

  asignar = async (
    solicitud: FastifyRequest<{ Params: ParamsDeFondo; Body: AsignarDocumentosSolicitado }>,
    respuesta: FastifyReply,
  ) => {
    const resultado = await this.casosDeUso.asignar.ejecutar(operadorDe(solicitud), {
      fondoId: solicitud.params.id,
      documentos: solicitud.body.documentos,
      permisos: {
        sobreElTope: tiene(solicitud, PERMISO_SOBRE_EL_TOPE),
        conRetencion: tiene(solicitud, PERMISO_CON_RETENCION),
      },
    });
    return respuesta.status(201).send(resultado);
  };

  registrarVale = async (
    solicitud: FastifyRequest<{ Params: ParamsDeFondo; Body: ValeDeGastoSolicitado }>,
    respuesta: FastifyReply,
  ) => {
    const resultado = await this.casosDeUso.registrarVale.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      fondoId: solicitud.params.id,
      puedeSobreElTope: tiene(solicitud, PERMISO_SOBRE_EL_TOPE),
    });
    return respuesta.status(201).send(resultado);
  };

  devolver = (solicitud: FastifyRequest<{ Params: ParamsDeComprobante; Body: ConMotivoSolicitado }>) =>
    this.casosDeUso.devolver.ejecutar(operadorDe(solicitud), {
      comprobanteId: solicitud.params.id,
      motivo: solicitud.body.motivo,
    });

  anular = (solicitud: FastifyRequest<{ Params: ParamsDeComprobante; Body: ConMotivoSolicitado }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      comprobanteId: solicitud.params.id,
      motivo: solicitud.body.motivo,
    });
}
