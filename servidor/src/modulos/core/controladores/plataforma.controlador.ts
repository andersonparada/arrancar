import type { FastifyReply, FastifyRequest } from 'fastify';
import { altaCuentaServicio } from '../servicios/alta-cuenta.servicio.js';
import { plataformaServicio } from '../servicios/plataforma.servicio.js';
import type {
  AltaCuenta,
  CambioCuenta,
  ParamsCuenta,
  ParamsModuloCuenta,
} from '../validaciones/plataforma.validaciones.js';

export const plataformaControlador = {
  listarCuentas() {
    return plataformaServicio.listarCuentas();
  },

  async crearCuenta(solicitud: FastifyRequest<{ Body: AltaCuenta }>, respuesta: FastifyReply) {
    const resultado = await altaCuentaServicio.darDeAlta(solicitud.body);
    return respuesta.status(201).send(resultado);
  },

  async actualizarCuenta(
    solicitud: FastifyRequest<{ Params: ParamsCuenta; Body: CambioCuenta }>,
    respuesta: FastifyReply,
  ) {
    await plataformaServicio.actualizarCuenta(solicitud.params.cuentaId, solicitud.body);
    return respuesta.status(204).send();
  },

  listarCatalogoModulos() {
    return plataformaServicio.listarModulos();
  },

  listarModulosDeCuenta(solicitud: FastifyRequest<{ Params: ParamsCuenta }>) {
    return plataformaServicio.listarModulos(solicitud.params.cuentaId);
  },

  activarModulo(solicitud: FastifyRequest<{ Params: ParamsModuloCuenta }>) {
    return plataformaServicio.activarModulo(solicitud.params.cuentaId, solicitud.params.clave);
  },

  desactivarModulo(solicitud: FastifyRequest<{ Params: ParamsModuloCuenta }>) {
    return plataformaServicio.desactivarModulo(solicitud.params.cuentaId, solicitud.params.clave);
  },

  listarBitacora() {
    return plataformaServicio.listarBitacora();
  },
};
