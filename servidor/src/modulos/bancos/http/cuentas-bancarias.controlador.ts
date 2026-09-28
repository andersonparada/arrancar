import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarCuentaBancaria } from '../aplicacion/casos-uso/cuentas-bancarias/actualizar-cuenta-bancaria.js';
import type { CrearCuentaBancaria } from '../aplicacion/casos-uso/cuentas-bancarias/crear-cuenta-bancaria.js';
import type { ListarCuentasBancarias } from '../aplicacion/casos-uso/cuentas-bancarias/listar-cuentas-bancarias.js';
import type { ObtenerCuentaBancaria } from '../aplicacion/casos-uso/cuentas-bancarias/obtener-cuenta-bancaria.js';
import type { CuentaBancariaSolicitado, ParamsCuentaBancaria } from './cuentas-bancarias.esquemas-http.js';

export interface CasosDeUsoDeCuentasBancarias {
  listar: ListarCuentasBancarias;
  obtener: ObtenerCuentaBancaria;
  crear: CrearCuentaBancaria;
  actualizar: ActualizarCuentaBancaria;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class CuentasBancariasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeCuentasBancarias) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsCuentaBancaria }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.cuentaBancariaId);

  crear = async (solicitud: FastifyRequest<{ Body: CuentaBancariaSolicitado }>, respuesta: FastifyReply) => {
    const cuentaBancaria = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(cuentaBancaria);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsCuentaBancaria; Body: CuentaBancariaSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      cuentaBancariaId: solicitud.params.cuentaBancariaId,
      solicitud: solicitud.body,
    });
}
