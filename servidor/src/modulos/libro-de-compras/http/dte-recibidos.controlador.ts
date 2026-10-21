import type { FastifyRequest } from 'fastify';
import { contextoDe } from '../../core/compartido/http/contexto-de-la-solicitud.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { CompletarDteRecibidos } from '../aplicacion/casos-uso/bandeja/completar-dte-recibidos.js';
import type { ConfirmarDteRecibidos } from '../aplicacion/casos-uso/bandeja/confirmar-dte-recibidos.js';
import type {
  DescartarDteRecibidos,
  RestaurarDteRecibido,
} from '../aplicacion/casos-uso/bandeja/descartar-y-restaurar-dte-recibidos.js';
import type { ListarDteRecibidos } from '../aplicacion/casos-uso/bandeja/listar-dte-recibidos.js';
import type { ObtenerSolicitudDeDte } from '../aplicacion/casos-uso/bandeja/obtener-solicitud-de-dte.js';
import type { VistaPreviaDeDteRecibidos } from '../aplicacion/casos-uso/bandeja/vista-previa-de-dte-recibidos.js';
import type {
  CompletarDteRecibidosSolicitado,
  ConfirmarDteRecibidosSolicitado,
  DescartarDteRecibidosSolicitado,
  FiltroDeDteRecibidosSolicitado,
  ParamsDeDte,
} from './dte-recibidos.esquemas-http.js';

export interface CasosDeUsoDeDteRecibidos {
  listar: ListarDteRecibidos;
  completar: CompletarDteRecibidos;
  vistaPrevia: VistaPreviaDeDteRecibidos;
  confirmar: ConfirmarDteRecibidos;
  solicitud: ObtenerSolicitudDeDte;
  descartar: DescartarDteRecibidos;
  restaurar: RestaurarDteRecibido;
}

const PERMISO_DE_CREAR_PROVEEDORES = 'proveedores.crear';

/** Traduce las peticiones HTTP a casos de uso de la bandeja de DTE recibidos; no contiene reglas de negocio. */
export class DteRecibidosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeDteRecibidos) {}

  listar = (solicitud: FastifyRequest<{ Querystring: FiltroDeDteRecibidosSolicitado }>) => {
    const { pagina, limite, ...filtro } = solicitud.query;
    return this.casosDeUso.listar.ejecutar(operadorDe(solicitud), filtro, { pagina, limite });
  };

  completar = async (solicitud: FastifyRequest<{ Body: CompletarDteRecibidosSolicitado }>) => ({
    elementos: await this.casosDeUso.completar.ejecutar(operadorDe(solicitud), solicitud.body),
  });

  vistaPrevia = (solicitud: FastifyRequest<{ Body: ConfirmarDteRecibidosSolicitado }>) =>
    this.casosDeUso.vistaPrevia.ejecutar(operadorDe(solicitud), solicitud.body);

  confirmar = (solicitud: FastifyRequest<{ Body: ConfirmarDteRecibidosSolicitado }>) =>
    this.casosDeUso.confirmar.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      puedeCrearProveedores: contextoDe(solicitud).permisos.has(PERMISO_DE_CREAR_PROVEEDORES),
    });

  solicitud = (solicitud: FastifyRequest<{ Params: ParamsDeDte }>) =>
    this.casosDeUso.solicitud.ejecutar(operadorDe(solicitud), solicitud.params.dteId);

  descartar = async (solicitud: FastifyRequest<{ Body: DescartarDteRecibidosSolicitado }>) => ({
    elementos: await this.casosDeUso.descartar.ejecutar(operadorDe(solicitud), solicitud.body),
  });

  restaurar = (solicitud: FastifyRequest<{ Params: ParamsDeDte }>) =>
    this.casosDeUso.restaurar.ejecutar(operadorDe(solicitud), solicitud.params.dteId);
}
