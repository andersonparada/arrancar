import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarEmpresa } from '../aplicacion/casos-uso/actualizar-empresa.js';
import type { ListarEmpresas } from '../aplicacion/casos-uso/listar-empresas.js';
import type { ObtenerEmpresa } from '../aplicacion/casos-uso/obtener-empresa.js';
import type { RegistrarEmpresa } from '../aplicacion/casos-uso/registrar-empresa.js';
import type { EmpresaSolicitada, ParamsEmpresa } from './empresas.esquemas-http.js';

export interface CasosDeUsoDeEmpresas {
  listar: ListarEmpresas;
  obtener: ObtenerEmpresa;
  registrar: RegistrarEmpresa;
  actualizar: ActualizarEmpresa;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class EmpresasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeEmpresas) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsEmpresa }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.empresaId);

  registrar = async (solicitud: FastifyRequest<{ Body: EmpresaSolicitada }>, respuesta: FastifyReply) => {
    const empresa = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(empresa);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsEmpresa; Body: EmpresaSolicitada }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      empresaId: solicitud.params.empresaId,
      solicitud: solicitud.body,
    });
}
