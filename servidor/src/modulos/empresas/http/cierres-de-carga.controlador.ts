import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ExportarCierreDeCargaInicial } from '../aplicacion/casos-uso/historial-de-carga/exportar-cierre-de-carga-inicial.js';
import type { ListarHistorialDeCargaInicial } from '../aplicacion/casos-uso/historial-de-carga/listar-historial-de-carga-inicial.js';
import type { ObtenerCierreDeCargaInicial } from '../aplicacion/casos-uso/historial-de-carga/obtener-cierre-de-carga-inicial.js';
import type { ParamsCierre } from './cierres-de-carga.esquemas-http.js';
import type { ParamsEmpresa } from './empresas.esquemas-http.js';

const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface CasosDeUsoDeCierresDeCarga {
  listarHistorial: ListarHistorialDeCargaInicial;
  obtenerCierre: ObtenerCierreDeCargaInicial;
  exportarCierre: ExportarCierreDeCargaInicial;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class CierresDeCargaControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeCierresDeCarga) {}

  listarHistorial = (solicitud: FastifyRequest<{ Params: ParamsEmpresa }>) =>
    this.casosDeUso.listarHistorial.ejecutar(operadorDe(solicitud), solicitud.params.empresaId);

  obtenerCierre = (solicitud: FastifyRequest<{ Params: ParamsCierre }>) =>
    this.casosDeUso.obtenerCierre.ejecutar(operadorDe(solicitud), solicitud.params);

  exportarCierre = async (solicitud: FastifyRequest<{ Params: ParamsCierre }>, respuesta: FastifyReply) => {
    const { contenido, nombreDeArchivo } = await this.casosDeUso.exportarCierre.ejecutar(
      operadorDe(solicitud),
      solicitud.params,
    );
    return respuesta
      .header('Content-Type', TIPO_EXCEL)
      .header('Content-Disposition', `attachment; filename="${nombreDeArchivo}"`)
      .header('Cache-Control', 'private, no-store')
      .send(contenido);
  };
}
