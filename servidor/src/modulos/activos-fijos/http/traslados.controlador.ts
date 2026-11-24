import type { FastifyReply, FastifyRequest } from 'fastify';
import { leerDocumentoDeSolicitud } from '../../core/archivos/http/leer-documento.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AbrirBoletaFirmada } from '../aplicacion/casos-uso/traslados/abrir-boleta-firmada.js';
import type { AnularTraslado } from '../aplicacion/casos-uso/traslados/anular-traslado.js';
import type { ObtenerBoleta } from '../aplicacion/casos-uso/traslados/obtener-boleta.js';
import type { SubirBoletaFirmada } from '../aplicacion/casos-uso/traslados/subir-boleta-firmada.js';
import type { TrasladarActivos } from '../aplicacion/casos-uso/traslados/trasladar-activos.js';
import type { AnulacionDeTrasladoSolicitada, ParamsBoleta, TrasladoSolicitado } from './traslados.esquemas-http.js';

export interface CasosDeUsoDeTraslados {
  trasladar: TrasladarActivos;
  anular: AnularTraslado;
  obtenerBoleta: ObtenerBoleta;
  subirFirmada: SubirBoletaFirmada;
  abrirFirmada: AbrirBoletaFirmada;
}

/** Traduce las peticiones HTTP de los traslados a casos de uso; no contiene reglas de negocio. */
export class TrasladosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeTraslados) {}

  trasladar = async (solicitud: FastifyRequest<{ Body: TrasladoSolicitado }>, respuesta: FastifyReply) => {
    const boleta = await this.casosDeUso.trasladar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(boleta);
  };

  anular = (solicitud: FastifyRequest<{ Params: ParamsBoleta; Body: AnulacionDeTrasladoSolicitada }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      grupoId: solicitud.params.grupoId,
      motivo: solicitud.body.motivo,
    });

  obtenerBoleta = (solicitud: FastifyRequest<{ Params: ParamsBoleta }>) =>
    this.casosDeUso.obtenerBoleta.ejecutar(operadorDe(solicitud), solicitud.params.grupoId);

  subirFirmada = async (solicitud: FastifyRequest<{ Params: ParamsBoleta }>, respuesta: FastifyReply) => {
    const { contenido, nombre } = await leerDocumentoDeSolicitud(solicitud);
    const firmada = await this.casosDeUso.subirFirmada.ejecutar(operadorDe(solicitud), {
      grupoId: solicitud.params.grupoId,
      contenido,
      nombre,
    });
    return respuesta.status(200).send(firmada);
  };

  abrirFirmada = async (solicitud: FastifyRequest<{ Params: ParamsBoleta }>, respuesta: FastifyReply) => {
    const archivo = await this.casosDeUso.abrirFirmada.ejecutar(operadorDe(solicitud), solicitud.params.grupoId);
    return respuesta
      .header('Content-Type', archivo.tipoMime)
      .header('Content-Disposition', `inline; filename="${archivo.nombre}"`)
      .header('Cache-Control', 'private, no-store')
      .send(archivo.contenido);
  };
}
