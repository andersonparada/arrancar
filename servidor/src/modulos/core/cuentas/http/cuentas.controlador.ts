import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ActivarModulo } from '../aplicacion/casos-uso/activar-modulo.js';
import type { CambiarCuenta } from '../aplicacion/casos-uso/cambiar-cuenta.js';
import type { DarDeAltaCuenta } from '../aplicacion/casos-uso/dar-de-alta-cuenta.js';
import type { DesactivarModulo } from '../aplicacion/casos-uso/desactivar-modulo.js';
import type { ListarCuentas } from '../aplicacion/casos-uso/listar-cuentas.js';
import type { ListarModulos } from '../aplicacion/casos-uso/listar-modulos.js';
import type { AltaCuenta, CambioCuenta, ParamsCuenta, ParamsModuloCuenta } from './cuentas.esquemas-http.js';

export interface CasosDeUsoDeCuentas {
  listar: ListarCuentas;
  darDeAlta: DarDeAltaCuenta;
  cambiar: CambiarCuenta;
  listarModulos: ListarModulos;
  activarModulo: ActivarModulo;
  desactivarModulo: DesactivarModulo;
}

type SolicitudDeModulo = FastifyRequest<{ Params: ParamsModuloCuenta }>;

const moduloDe = ({ params }: SolicitudDeModulo) => ({ cuentaId: params.cuentaId, modulo: params.clave });

/** Panel de soporte: las cuentas suscriptoras y sus módulos contratados. */
export class CuentasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeCuentas) {}

  listar = () => this.casosDeUso.listar.ejecutar();

  darDeAlta = async (solicitud: FastifyRequest<{ Body: AltaCuenta }>, respuesta: FastifyReply) => {
    const resultado = await this.casosDeUso.darDeAlta.ejecutar(solicitud.body);
    return respuesta.status(201).send(resultado);
  };

  cambiar = async (
    solicitud: FastifyRequest<{ Params: ParamsCuenta; Body: CambioCuenta }>,
    respuesta: FastifyReply,
  ) => {
    await this.casosDeUso.cambiar.ejecutar(solicitud.params.cuentaId, solicitud.body);
    return respuesta.status(204).send();
  };

  listarCatalogo = () => this.casosDeUso.listarModulos.ejecutar();

  listarModulos = (solicitud: FastifyRequest<{ Params: ParamsCuenta }>) =>
    this.casosDeUso.listarModulos.ejecutar(solicitud.params.cuentaId);

  activarModulo = (solicitud: SolicitudDeModulo) => this.casosDeUso.activarModulo.ejecutar(moduloDe(solicitud));

  desactivarModulo = (solicitud: SolicitudDeModulo) => this.casosDeUso.desactivarModulo.ejecutar(moduloDe(solicitud));
}
