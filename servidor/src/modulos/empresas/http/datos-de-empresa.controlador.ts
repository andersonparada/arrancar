import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { CerrarCargaInicial } from '../aplicacion/casos-uso/datos-de-empresa/cerrar-carga-inicial.js';
import type { EstablecerFechaDeInicio } from '../aplicacion/casos-uso/datos-de-empresa/establecer-fecha-de-inicio.js';
import type { GuardarDatosFiscales } from '../aplicacion/casos-uso/datos-de-empresa/guardar-datos-fiscales.js';
import type { ObtenerCargaInicial } from '../aplicacion/casos-uso/datos-de-empresa/obtener-carga-inicial.js';
import type { ObtenerDatosFiscales } from '../aplicacion/casos-uso/datos-de-empresa/obtener-datos-fiscales.js';
import type { RevisarCierreDeCargaInicial } from '../aplicacion/casos-uso/datos-de-empresa/revisar-cierre-de-carga-inicial.js';
import type { ReabrirCargaInicial } from '../aplicacion/casos-uso/datos-de-empresa/reabrir-carga-inicial.js';
import type {
  CierreSolicitado,
  DatosFiscalesSolicitados,
  FechaDeInicioSolicitada,
  ReaperturaSolicitada,
} from './datos-de-empresa.esquemas-http.js';
import { cargaSegunPermiso } from './carga-segun-permiso.js';
import type { ParamsEmpresa } from './empresas.esquemas-http.js';

export interface CasosDeUsoDeDatosDeEmpresa {
  obtenerDatosFiscales: ObtenerDatosFiscales;
  guardarDatosFiscales: GuardarDatosFiscales;
  obtenerCargaInicial: ObtenerCargaInicial;
  establecerFechaDeInicio: EstablecerFechaDeInicio;
  revisarCierreDeCargaInicial: RevisarCierreDeCargaInicial;
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

  obtenerCargaInicial = async (solicitud: Solicitud) =>
    cargaSegunPermiso(
      solicitud,
      await this.casosDeUso.obtenerCargaInicial.ejecutar(operadorDe(solicitud), solicitud.params.empresaId),
    );

  establecerFechaDeInicio = async (solicitud: Solicitud<FechaDeInicioSolicitada>) =>
    cargaSegunPermiso(
      solicitud,
      await this.casosDeUso.establecerFechaDeInicio.ejecutar(operadorDe(solicitud), {
        empresaId: solicitud.params.empresaId,
        fechaDeInicio: solicitud.body.fechaDeInicio,
      }),
    );

  revisarCierreDeCargaInicial = (solicitud: Solicitud) =>
    this.casosDeUso.revisarCierreDeCargaInicial.ejecutar(operadorDe(solicitud), solicitud.params.empresaId);

  cerrarCargaInicial = async (solicitud: Solicitud<CierreSolicitado | null | undefined>) =>
    cargaSegunPermiso(
      solicitud,
      await this.casosDeUso.cerrarCargaInicial.ejecutar(operadorDe(solicitud), {
        empresaId: solicitud.params.empresaId,
        motivo: solicitud.body?.motivo,
        huella: solicitud.body?.huella,
      }),
    );

  reabrirCargaInicial = async (solicitud: Solicitud<ReaperturaSolicitada>) =>
    cargaSegunPermiso(
      solicitud,
      await this.casosDeUso.reabrirCargaInicial.ejecutar(operadorDe(solicitud), {
        empresaId: solicitud.params.empresaId,
        motivo: solicitud.body.motivo,
      }),
    );
}
