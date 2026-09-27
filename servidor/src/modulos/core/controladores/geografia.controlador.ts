import type { FastifyRequest } from 'fastify';
import { geografiaRepositorio } from '../repositorios/geografia.repositorio.js';
import type { ParamsDepartamento } from '../validaciones/geografia.validaciones.js';

/** Catálogo de solo lectura de departamentos y municipios de Guatemala (INE). */
export const geografiaControlador = {
  listarDepartamentos() {
    return geografiaRepositorio.listarDepartamentos();
  },

  listarMunicipios(solicitud: FastifyRequest<{ Params: ParamsDepartamento }>) {
    return geografiaRepositorio.listarMunicipios(solicitud.params.codigo);
  },
};
