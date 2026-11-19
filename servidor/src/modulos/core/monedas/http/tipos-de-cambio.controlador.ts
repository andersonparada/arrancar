import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../compartido/http/operador-de-la-solicitud.js';
import type { CargarTiposDeCambio } from '../aplicacion/casos-uso/cargar-tipos-de-cambio.js';
import type { ConsultarTipoVigente } from '../aplicacion/casos-uso/consultar-tipo-vigente.js';
import type { ListarSerieDeTipos } from '../aplicacion/casos-uso/listar-serie-de-tipos.js';
import type { ListarVersionesDeTipo } from '../aplicacion/casos-uso/listar-versiones-de-tipo.js';
import type { RegistrarTipoDeCambio } from '../aplicacion/casos-uso/registrar-tipo-de-cambio.js';
import type {
  CargaManual,
  ConsultaSerie,
  ConsultaVigente,
  ParamsVersiones,
  TipoManual,
} from './tipos-de-cambio.esquemas-http.js';

export interface CasosDeUsoDeTiposDeCambio {
  serie: ListarSerieDeTipos;
  vigente: ConsultarTipoVigente;
  versiones: ListarVersionesDeTipo;
  registrar: RegistrarTipoDeCambio;
  cargar: CargarTiposDeCambio;
}

export class TiposDeCambioControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeTiposDeCambio) {}

  serie = ({ query }: FastifyRequest<{ Querystring: ConsultaSerie }>) =>
    this.casosDeUso.serie.ejecutar(query.moneda, query.desde, query.hasta);

  vigente = ({ query }: FastifyRequest<{ Querystring: ConsultaVigente }>) =>
    this.casosDeUso.vigente.ejecutar(query.moneda, query.fecha);

  versiones = ({ params }: FastifyRequest<{ Params: ParamsVersiones }>) =>
    this.casosDeUso.versiones.ejecutar(params.moneda, params.fecha);

  cargar = (solicitud: FastifyRequest<{ Body: CargaManual }>) =>
    this.casosDeUso.cargar.cargarAhora({ ...solicitud.body, usuarioId: operadorDe(solicitud).usuarioId });

  registrar = async (solicitud: FastifyRequest<{ Body: TipoManual }>, respuesta: FastifyReply) => {
    const creado = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(creado);
  };
}
