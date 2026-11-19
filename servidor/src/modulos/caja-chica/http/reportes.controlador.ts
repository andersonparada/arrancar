import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ReporteDeReposiciones } from '../aplicacion/casos-uso/reportes/reporte-de-reposiciones.js';
import type {
  ReporteDeArqueos,
  ReporteDeEstadoDeFondos,
} from '../aplicacion/casos-uso/reportes/reportes-de-fondos-y-arqueos.js';
import type {
  ReporteDeGastosSinDocumento,
  ReporteDePendientesDeReponer,
} from '../aplicacion/casos-uso/reportes/reportes-de-comprobantes.js';
import type { FiltroAlCorteSolicitado, FiltroDePeriodoSolicitado } from './reportes.esquemas-http.js';

export interface CasosDeUsoDeReportes {
  pendientes: ReporteDePendientesDeReponer;
  reposiciones: ReporteDeReposiciones;
  sinDocumento: ReporteDeGastosSinDocumento;
  estadoDeFondos: ReporteDeEstadoDeFondos;
  arqueos: ReporteDeArqueos;
}

type AlCorte = FastifyRequest<{ Querystring: FiltroAlCorteSolicitado }>;
type DelPeriodo = FastifyRequest<{ Querystring: FiltroDePeriodoSolicitado }>;

/** Traduce las peticiones de CC-R1 a CC-R5 (solo lectura) a sus casos de uso. */
export class ReportesDeCajaChicaControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeReportes) {}

  pendientes = (solicitud: AlCorte) => this.casosDeUso.pendientes.ejecutar(operadorDe(solicitud), solicitud.query);

  reposiciones = (solicitud: DelPeriodo) =>
    this.casosDeUso.reposiciones.ejecutar(operadorDe(solicitud), solicitud.query);

  sinDocumento = (solicitud: DelPeriodo) =>
    this.casosDeUso.sinDocumento.ejecutar(operadorDe(solicitud), solicitud.query);

  estadoDeFondos = (solicitud: AlCorte) =>
    this.casosDeUso.estadoDeFondos.ejecutar(operadorDe(solicitud), solicitud.query);

  arqueos = (solicitud: DelPeriodo) => this.casosDeUso.arqueos.ejecutar(operadorDe(solicitud), solicitud.query);
}
