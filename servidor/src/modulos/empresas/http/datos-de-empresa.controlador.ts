import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { CerrarCargaInicial } from '../aplicacion/casos-uso/datos-de-empresa/cerrar-carga-inicial.js';
import type { EstablecerFechaDeInicio } from '../aplicacion/casos-uso/datos-de-empresa/establecer-fecha-de-inicio.js';
import type { GuardarDatosFiscales } from '../aplicacion/casos-uso/datos-de-empresa/guardar-datos-fiscales.js';
import type { ObtenerCargaInicial } from '../aplicacion/casos-uso/datos-de-empresa/obtener-carga-inicial.js';
import type { ObtenerDatosFiscales } from '../aplicacion/casos-uso/datos-de-empresa/obtener-datos-fiscales.js';
import type { ReabrirCargaInicial } from '../aplicacion/casos-uso/datos-de-empresa/reabrir-carga-inicial.js';
import type {
  DatosFiscalesSolicitados,
  FechaDeInicioSolicitada,
  ReaperturaSolicitada,
} from './datos-de-empresa.esquemas-http.js';
import type { ParamsEmpresa } from './empresas.esquemas-http.js';

export interface CasosDeUsoDeDatosDeEmpresa {
  obtenerDatosFiscales: ObtenerDatosFiscales;
  guardarDatosFiscales: GuardarDatosFiscales;
  obtenerCargaInicial: ObtenerCargaInicial;
  establecerFechaDeInicio: EstablecerFechaDeInicio;
  cerrarCargaInicial: CerrarCargaInicial;
  reabrirCargaInicial: ReabrirCargaInicial;
}

type Solicitud<Body = undefined> = FastifyRequest<{ Params: ParamsEmpresa; Body: Body }>;

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class DatosDeEmpresaControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeDatosDeEmpresa) {}

  obtenerDatosFiscales = (solicitud: Solicitud) =>
    this.casosDeUso.obtenerDatosFiscales.ejecutar(operadorDe(solicitud), solicitud.params.empresaId);

  guardarDatosFiscales = (solicitud: Solicitud<DatosFiscalesSolicitados>) =>
    this.casosDeUso.guardarDatosFiscales.ejecutar(operadorDe(solicitud), {
      empresaId: solicitud.params.empresaId,
      solicitud: solicitud.body,
    });

  obtenerCargaInicial = (solicitud: Solicitud) =>
    this.casosDeUso.obtenerCargaInicial.ejecutar(operadorDe(solicitud), solicitud.params.empresaId);

  establecerFechaDeInicio = (solicitud: Solicitud<FechaDeInicioSolicitada>) =>
    this.casosDeUso.establecerFechaDeInicio.ejecutar(operadorDe(solicitud), {
      empresaId: solicitud.params.empresaId,
      fechaDeInicio: solicitud.body.fechaDeInicio,
    });

  cerrarCargaInicial = (solicitud: Solicitud) =>
    this.casosDeUso.cerrarCargaInicial.ejecutar(operadorDe(solicitud), solicitud.params.empresaId);

  reabrirCargaInicial = (solicitud: Solicitud<ReaperturaSolicitada>) =>
    this.casosDeUso.reabrirCargaInicial.ejecutar(operadorDe(solicitud), {
      empresaId: solicitud.params.empresaId,
      motivo: solicitud.body.motivo,
    });
}
