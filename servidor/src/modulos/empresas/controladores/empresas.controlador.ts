import type { FastifyReply, FastifyRequest } from 'fastify';
import { contextoDe, empresaActivaDe } from '../../core/http/contexto-solicitud.js';
import { empresasServicio, type OperadorCuenta } from '../servicios/empresas.servicio.js';
import type { EmpresaSolicitada, ParamsEmpresa } from '../validaciones/empresas.validaciones.js';

function operadorDe(solicitud: FastifyRequest): OperadorCuenta {
  const { usuarioId, cuentaId, empresaId } = empresaActivaDe(solicitud);
  return {
    usuarioId,
    esSuperacceso: contextoDe(solicitud).usuario.esSuperacceso,
    cuentaId,
    empresaActivaId: empresaId,
  };
}

export const empresasControlador = {
  listar(solicitud: FastifyRequest) {
    return empresasServicio.listar(operadorDe(solicitud));
  },

  obtener(solicitud: FastifyRequest<{ Params: ParamsEmpresa }>) {
    return empresasServicio.obtener(operadorDe(solicitud), solicitud.params.empresaId);
  },

  async crear(solicitud: FastifyRequest<{ Body: EmpresaSolicitada }>, respuesta: FastifyReply) {
    const empresa = await empresasServicio.crear(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(empresa);
  },

  actualizar(solicitud: FastifyRequest<{ Params: ParamsEmpresa; Body: EmpresaSolicitada }>) {
    return empresasServicio.actualizar(operadorDe(solicitud), solicitud.params.empresaId, solicitud.body);
  },
};
