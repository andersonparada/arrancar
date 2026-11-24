import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { CerrarMes } from '../aplicacion/casos-uso/cierres/cerrar-mes.js';
import type { ListarCierres } from '../aplicacion/casos-uso/cierres/listar-cierres.js';
import type { ListarExistenciasAlCierre } from '../aplicacion/casos-uso/cierres/listar-existencias-al-cierre.js';
import type { ReabrirMes } from '../aplicacion/casos-uso/cierres/reabrir-mes.js';
import type { RevisarCierre } from '../aplicacion/casos-uso/cierres/revisar-cierre.js';
import type { CierreSolicitado, ParamsPeriodo, ReaperturaSolicitada } from './cierres.esquemas-http.js';
import { vistaDe } from './vista-de-la-solicitud.js';

export interface CasosDeUsoDeCierres {
  listar: ListarCierres;
  revisar: RevisarCierre;
  cerrar: CerrarMes;
  reabrir: ReabrirMes;
  existencias: ListarExistenciasAlCierre;
}

/** Traduce las peticiones HTTP del cierre de inventario a casos de uso; no contiene reglas de negocio. */
export class CierresControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeCierres) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud), vistaDe(solicitud));

  revisar = (solicitud: FastifyRequest<{ Params: ParamsPeriodo }>) =>
    this.casosDeUso.revisar.ejecutar(operadorDe(solicitud), {
      periodo: solicitud.params.periodo,
      vista: vistaDe(solicitud),
    });

  cerrar = (solicitud: FastifyRequest<{ Params: ParamsPeriodo; Body: CierreSolicitado }>) =>
    this.casosDeUso.cerrar.ejecutar(operadorDe(solicitud), {
      periodo: solicitud.params.periodo,
      huella: solicitud.body.huella,
      vista: vistaDe(solicitud),
    });

  reabrir = (solicitud: FastifyRequest<{ Params: ParamsPeriodo; Body: ReaperturaSolicitada }>) =>
    this.casosDeUso.reabrir.ejecutar(operadorDe(solicitud), {
      periodo: solicitud.params.periodo,
      motivo: solicitud.body.motivo,
      vista: vistaDe(solicitud),
    });

  existencias = (solicitud: FastifyRequest<{ Params: ParamsPeriodo }>) =>
    this.casosDeUso.existencias.ejecutar(operadorDe(solicitud), {
      periodo: solicitud.params.periodo,
      vista: vistaDe(solicitud),
    });
}
