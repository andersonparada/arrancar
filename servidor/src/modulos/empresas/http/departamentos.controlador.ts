import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarDepartamento } from '../aplicacion/casos-uso/departamentos/actualizar-departamento.js';
import type { EliminarDepartamento } from '../aplicacion/casos-uso/departamentos/eliminar-departamento.js';
import type { CrearDepartamento } from '../aplicacion/casos-uso/departamentos/crear-departamento.js';
import type { ListarDepartamentos } from '../aplicacion/casos-uso/departamentos/listar-departamentos.js';
import type { ObtenerDepartamento } from '../aplicacion/casos-uso/departamentos/obtener-departamento.js';
import type { DepartamentoSolicitado, ParamsDepartamento } from './departamentos.esquemas-http.js';

export interface CasosDeUsoDeDepartamentos {
  listar: ListarDepartamentos;
  obtener: ObtenerDepartamento;
  crear: CrearDepartamento;
  actualizar: ActualizarDepartamento;
  eliminar: EliminarDepartamento;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class DepartamentosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeDepartamentos) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDepartamento }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.departamentoId);

  crear = async (solicitud: FastifyRequest<{ Body: DepartamentoSolicitado }>, respuesta: FastifyReply) => {
    const departamento = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(departamento);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsDepartamento; Body: DepartamentoSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      departamentoId: solicitud.params.departamentoId,
      solicitud: solicitud.body,
    });

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsDepartamento }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.departamentoId);
    return respuesta.status(204).send();
  };
}
