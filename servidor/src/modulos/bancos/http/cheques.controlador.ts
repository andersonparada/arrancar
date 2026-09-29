import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularCheque } from '../aplicacion/casos-uso/cheques/anular-cheque.js';
import type { BlanquearCheque } from '../aplicacion/casos-uso/cheques/blanquear-cheque.js';
import type { EmitirCheque } from '../aplicacion/casos-uso/cheques/emitir-cheque.js';
import type { ListarChequesDeLaEmpresa } from '../aplicacion/casos-uso/cheques/listar-cheques-de-la-empresa.js';
import type { ReclasificarMovimientos } from '../aplicacion/casos-uso/movimientos/reclasificar-movimientos.js';
import type { SugerirConceptoAlCapturar } from '../aplicacion/casos-uso/sugerencias/sugerir-concepto-al-capturar.js';
import type { SiguienteChequeDisponible } from '../aplicacion/casos-uso/cheques/siguiente-cheque-disponible.js';
import type { ReclasificacionSolicitada } from './notas.esquemas-http.js';
import type { SugerenciaDeChequeSolicitada } from './sugerencias.esquemas-http.js';
import type {
  EmisionDeChequeSolicitada,
  FiltroDeChequesDeLaEmpresaSolicitado,
  ParamsCheque,
  ParamsCuentaBancariaDeCheques,
  SolicitudDeAnulacionDeCheque,
  SolicitudDeBlanqueoDeCheque,
} from './cheques.esquemas-http.js';

export interface CasosDeUsoDeCheques {
  listar: ListarChequesDeLaEmpresa;
  siguienteDisponible: SiguienteChequeDisponible;
  emitir: EmitirCheque;
  anular: AnularCheque;
  blanquear: BlanquearCheque;
  reclasificar: ReclasificarMovimientos;
  sugerirAlCapturar: SugerirConceptoAlCapturar;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ChequesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeCheques) {}

  listar = (solicitud: FastifyRequest<{ Querystring: FiltroDeChequesDeLaEmpresaSolicitado }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.query);

  siguienteDisponible = (solicitud: FastifyRequest<{ Params: ParamsCuentaBancariaDeCheques }>) =>
    this.casosDeUso.siguienteDisponible.ejecutar(operadorDe(solicitud), solicitud.params.cuentaBancariaId);

  emitir = (solicitud: FastifyRequest<{ Params: ParamsCheque; Body: EmisionDeChequeSolicitada }>) =>
    this.casosDeUso.emitir.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      chequeId: solicitud.params.chequeId,
    });

  anular = (solicitud: FastifyRequest<{ Params: ParamsCheque; Body: SolicitudDeAnulacionDeCheque }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      chequeId: solicitud.params.chequeId,
      motivo: solicitud.body.motivo,
      fecha: solicitud.body.fecha,
    });

  blanquear = (solicitud: FastifyRequest<{ Params: ParamsCheque; Body: SolicitudDeBlanqueoDeCheque }>) =>
    this.casosDeUso.blanquear.ejecutar(operadorDe(solicitud), {
      chequeId: solicitud.params.chequeId,
      motivo: solicitud.body.motivo,
    });

  /** Los cheques ya clasificados o pendientes: siempre solo cheques (`ReclasificarMovimientos` con clase `cheques`). */
  reclasificar = (solicitud: FastifyRequest<{ Body: ReclasificacionSolicitada }>) =>
    this.casosDeUso.reclasificar.ejecutar(operadorDe(solicitud), solicitud.body);

  sugerirConcepto = (solicitud: FastifyRequest<{ Body: SugerenciaDeChequeSolicitada }>) =>
    this.casosDeUso.sugerirAlCapturar.ejecutar(operadorDe(solicitud), { ...solicitud.body, tipo: 'cheque' });
}
