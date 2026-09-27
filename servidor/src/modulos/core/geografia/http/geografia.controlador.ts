import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../compartido/http/operador-de-la-solicitud.js';
import type { ListarDepartamentos } from '../aplicacion/casos-uso/listar-departamentos.js';
import type { ListarMunicipios } from '../aplicacion/casos-uso/listar-municipios.js';
import type { ParamsDepartamento } from './geografia.esquemas-http.js';

export interface CasosDeUsoDeGeografia {
  listarDepartamentos: ListarDepartamentos;
  listarMunicipios: ListarMunicipios;
}

export class GeografiaControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeGeografia) {}

  listarDepartamentos = (solicitud: FastifyRequest) =>
    this.casosDeUso.listarDepartamentos.ejecutar(operadorDe(solicitud));

  listarMunicipios = (solicitud: FastifyRequest<{ Params: ParamsDepartamento }>) =>
    this.casosDeUso.listarMunicipios.ejecutar(operadorDe(solicitud), solicitud.params.codigo);
}
