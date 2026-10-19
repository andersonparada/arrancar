import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ObtenerDatosFiscalesDeEmpresa } from '../aplicacion/casos-uso/datos-fiscales/obtener-datos-fiscales-de-empresa.js';
import type { QuitarVigenciaFiscalDeEmpresa } from '../aplicacion/casos-uso/datos-fiscales/quitar-vigencia-fiscal-de-empresa.js';
import type { ObtenerDatosFiscalesDeProveedor } from '../aplicacion/casos-uso/datos-fiscales/obtener-datos-fiscales-de-proveedor.js';
import type { ParamsDeEmpresa, ParamsDeProveedor, ParamsDeVigencia } from './datos-fiscales.esquemas-http.js';

export interface CasosDeUsoDeDatosFiscales {
  obtenerDeEmpresa: ObtenerDatosFiscalesDeEmpresa;
  obtenerDeProveedor: ObtenerDatosFiscalesDeProveedor;
  quitarVigenciaDeEmpresa: QuitarVigenciaFiscalDeEmpresa;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class DatosFiscalesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeDatosFiscales) {}

  obtenerDeEmpresa = (solicitud: FastifyRequest<{ Params: ParamsDeEmpresa }>) =>
    this.casosDeUso.obtenerDeEmpresa.ejecutar(operadorDe(solicitud), solicitud.params.empresaId);

  quitarVigenciaDeEmpresa = async (
    solicitud: FastifyRequest<{ Params: ParamsDeVigencia }>,
    respuesta: FastifyReply,
  ) => {
    const { empresaId, vigenciaId } = solicitud.params;
    await this.casosDeUso.quitarVigenciaDeEmpresa.ejecutar(operadorDe(solicitud), empresaId, vigenciaId);
    return respuesta.code(204).send();
  };

  obtenerDeProveedor = (solicitud: FastifyRequest<{ Params: ParamsDeProveedor }>) =>
    this.casosDeUso.obtenerDeProveedor.ejecutar(operadorDe(solicitud), solicitud.params.proveedorId);
}
