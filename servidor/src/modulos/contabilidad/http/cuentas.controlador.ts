import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarCuenta } from '../aplicacion/casos-uso/cuentas/actualizar-cuenta.js';
import type { CrearCuenta } from '../aplicacion/casos-uso/cuentas/crear-cuenta.js';
import type { EliminarCuenta } from '../aplicacion/casos-uso/cuentas/eliminar-cuenta.js';
import type { ListarCuentas } from '../aplicacion/casos-uso/cuentas/listar-cuentas.js';
import type { ObtenerCuenta } from '../aplicacion/casos-uso/cuentas/obtener-cuenta.js';
import type { CuentaSolicitado, ParamsCuenta } from './cuentas.esquemas-http.js';

export interface CasosDeUsoDeCuentas {
  listar: ListarCuentas;
  obtener: ObtenerCuenta;
  crear: CrearCuenta;
  actualizar: ActualizarCuenta;
  eliminar: EliminarCuenta;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class CuentasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeCuentas) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsCuenta }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.cuentaId);

  crear = async (solicitud: FastifyRequest<{ Body: CuentaSolicitado }>, respuesta: FastifyReply) => {
    const cuenta = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(cuenta);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsCuenta; Body: CuentaSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      cuentaId: solicitud.params.cuentaId,
      solicitud: solicitud.body,
    });

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsCuenta }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.cuentaId);
    return respuesta.status(204).send();
  };
}
