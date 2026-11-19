import type { FastifyReply, FastifyRequest } from 'fastify';
import { contextoDe } from '../../core/compartido/http/contexto-de-la-solicitud.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AsignarGastos } from '../aplicacion/casos-uso/gastos/asignar-gastos.js';
import type { ListarBandeja, ListarGastosDelAnticipo } from '../aplicacion/casos-uso/gastos/consultas-de-gastos.js';
import type { QuitarGasto } from '../aplicacion/casos-uso/gastos/quitar-gasto.js';
import type { RegistrarGastoSinDocumento } from '../aplicacion/casos-uso/gastos/registrar-gasto-sin-documento.js';
import type {
  AsignarGastosSolicitado,
  BandejaSolicitada,
  GastoSinDocumentoSolicitado,
  ParamsDeGasto,
  QuitarGastoSolicitado,
} from './gastos.esquemas-http.js';

const PERMISO_CON_RETENCION = 'cuentas-por-liquidar.gastos.con-retencion';

export interface CasosDeUsoDeGastos {
  asignar: AsignarGastos;
  sinDocumento: RegistrarGastoSinDocumento;
  quitar: QuitarGasto;
  bandeja: ListarBandeja;
  delAnticipo: ListarGastosDelAnticipo;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class GastosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeGastos) {}

  bandeja = (solicitud: FastifyRequest<{ Querystring: BandejaSolicitada }>) =>
    this.casosDeUso.bandeja.ejecutar(operadorDe(solicitud), {
      ...solicitud.query,
      puedeConRetencion: contextoDe(solicitud).permisos.has(PERMISO_CON_RETENCION),
    });

  delAnticipo = (solicitud: FastifyRequest<{ Params: ParamsDeGasto }>) =>
    this.casosDeUso.delAnticipo.ejecutar(operadorDe(solicitud), solicitud.params.id);

  asignar = async (
    solicitud: FastifyRequest<{ Params: ParamsDeGasto; Body: AsignarGastosSolicitado }>,
    respuesta: FastifyReply,
  ) => {
    const asignados = await this.casosDeUso.asignar.ejecutar(operadorDe(solicitud), {
      anticipoId: solicitud.params.id,
      documentos: solicitud.body.documentos,
      puedeConRetencion: contextoDe(solicitud).permisos.has(PERMISO_CON_RETENCION),
    });
    return respuesta.status(201).send(asignados);
  };

  sinDocumento = async (
    solicitud: FastifyRequest<{ Params: ParamsDeGasto; Body: GastoSinDocumentoSolicitado }>,
    respuesta: FastifyReply,
  ) => {
    const gasto = await this.casosDeUso.sinDocumento.ejecutar(operadorDe(solicitud), {
      anticipoId: solicitud.params.id,
      ...solicitud.body,
    });
    return respuesta.status(201).send(gasto);
  };

  quitar = (solicitud: FastifyRequest<{ Params: ParamsDeGasto; Body: QuitarGastoSolicitado }>) =>
    this.casosDeUso.quitar.ejecutar(operadorDe(solicitud), { gastoId: solicitud.params.id, ...solicitud.body });
}
