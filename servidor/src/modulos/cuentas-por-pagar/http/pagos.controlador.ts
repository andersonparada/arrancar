import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ListarCargosParaPagar } from '../aplicacion/casos-uso/pagos/listar-cargos-para-pagar.js';
import type { LigarNotaDeDebito } from '../aplicacion/casos-uso/pagos/ligar-nota-de-debito.js';
import type {
  ListarNotasParaLigar,
  ListarProveedoresPorPagar,
  ObtenerMediosDePago,
} from '../aplicacion/casos-uso/pagos/consultas-de-pagos.js';
import type { AplicarACuentaDeApertura } from '../aplicacion/casos-uso/pagos/aplicar-a-cuenta-de-apertura.js';
import type { AnularPago } from '../aplicacion/casos-uso/pagos/anular-pago.js';
import type { ReaplicarPago } from '../aplicacion/casos-uso/pagos/reaplicar-pago.js';
import type { SaldarDiferenciaDelPago } from '../aplicacion/casos-uso/pagos/saldar-diferencia-del-pago.js';
import type { RegistrarPago } from '../aplicacion/casos-uso/pagos/registrar-pago.js';
import type { ParamsDeProveedor } from './documentos.esquemas-http.js';
import type {
  AnularPagoSolicitado,
  MediosSolicitado,
  PagoDeAperturaSolicitado,
  NotasParaLigarSolicitado,
  PagoLigadoSolicitado,
  PagoSolicitado,
  ParamsDePago,
  ParaPagarSolicitado,
  ProveedoresPorPagarSolicitado,
  ReaplicarPagoSolicitado,
  SaldarDiferenciaSolicitada,
} from './pagos.esquemas-http.js';

export interface CasosDeUsoDePagos {
  registrar: RegistrarPago;
  ligar: LigarNotaDeDebito;
  aplicarAApertura: AplicarACuentaDeApertura;
  notasParaLigar: ListarNotasParaLigar;
  paraPagar: ListarCargosParaPagar;
  proveedoresPorPagar: ListarProveedoresPorPagar;
  medios: ObtenerMediosDePago;
  anular: AnularPago;
  reaplicar: ReaplicarPago;
  saldarDiferencia: SaldarDiferenciaDelPago;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class PagosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDePagos) {}

  registrar = async (solicitud: FastifyRequest<{ Body: PagoSolicitado }>, respuesta: FastifyReply) => {
    const pago = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(pago);
  };

  ligar = async (solicitud: FastifyRequest<{ Body: PagoLigadoSolicitado }>, respuesta: FastifyReply) => {
    const pago = await this.casosDeUso.ligar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(pago);
  };

  aplicarAApertura = async (solicitud: FastifyRequest<{ Body: PagoDeAperturaSolicitado }>, respuesta: FastifyReply) => {
    const pago = await this.casosDeUso.aplicarAApertura.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(pago);
  };

  notasParaLigar = (solicitud: FastifyRequest<{ Querystring: NotasParaLigarSolicitado }>) =>
    this.casosDeUso.notasParaLigar.ejecutar(operadorDe(solicitud), solicitud.query);

  paraPagar = (solicitud: FastifyRequest<{ Params: ParamsDeProveedor; Querystring: ParaPagarSolicitado }>) =>
    this.casosDeUso.paraPagar.ejecutar(operadorDe(solicitud), solicitud.params.proveedorId, solicitud.query);

  proveedoresPorPagar = (solicitud: FastifyRequest<{ Querystring: ProveedoresPorPagarSolicitado }>) =>
    this.casosDeUso.proveedoresPorPagar.ejecutar(operadorDe(solicitud), solicitud.query);

  medios = (solicitud: FastifyRequest<{ Querystring: MediosSolicitado }>) =>
    this.casosDeUso.medios.ejecutar(operadorDe(solicitud), solicitud.query.fecha);

  anular = (solicitud: FastifyRequest<{ Params: ParamsDePago; Body: AnularPagoSolicitado }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), { pagoId: solicitud.params.id, ...solicitud.body });

  reaplicar = (solicitud: FastifyRequest<{ Params: ParamsDePago; Body: ReaplicarPagoSolicitado }>) =>
    this.casosDeUso.reaplicar.ejecutar(operadorDe(solicitud), { pagoId: solicitud.params.id, ...solicitud.body });

  saldarDiferencia = async (
    solicitud: FastifyRequest<{ Params: ParamsDePago; Body: SaldarDiferenciaSolicitada }>,
    respuesta: FastifyReply,
  ) => {
    const pago = await this.casosDeUso.saldarDiferencia.ejecutar(operadorDe(solicitud), {
      pagoId: solicitud.params.id,
      ...solicitud.body,
    });
    return respuesta.status(201).send(pago);
  };
}
