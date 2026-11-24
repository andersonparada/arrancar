import type { FastifyReply, FastifyRequest } from 'fastify';
import { leerDocumentoDeSolicitud } from '../../core/archivos/http/leer-documento.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AbrirActaDeBaja } from '../aplicacion/casos-uso/bajas/abrir-acta-de-baja.js';
import type { AbrirDenunciaDeBaja } from '../aplicacion/casos-uso/bajas/abrir-denuncia-de-baja.js';
import type { DocumentoDeBajaAbierto } from '../aplicacion/casos-uso/bajas/abrir-documento-de-baja.js';
import type { AnularBaja } from '../aplicacion/casos-uso/bajas/anular-baja.js';
import type { DarDeBaja } from '../aplicacion/casos-uso/bajas/dar-de-baja.js';
import type { ObtenerBaja } from '../aplicacion/casos-uso/bajas/obtener-baja.js';
import type { RegistrarVenta } from '../aplicacion/casos-uso/bajas/registrar-venta.js';
import type { SubirActaDeBaja } from '../aplicacion/casos-uso/bajas/subir-acta-de-baja.js';
import type { SubirDenunciaDeBaja } from '../aplicacion/casos-uso/bajas/subir-denuncia-de-baja.js';
import type { AnulacionDeBajaSolicitada, BajaSolicitada, ConsultaDeActa, ParamsBaja } from './bajas.esquemas-http.js';

export interface CasosDeUsoDeBajas {
  darDeBaja: DarDeBaja;
  registrarVenta: RegistrarVenta;
  anular: AnularBaja;
  obtener: ObtenerBaja;
  subirActa: SubirActaDeBaja;
  subirDenuncia: SubirDenunciaDeBaja;
  abrirActa: AbrirActaDeBaja;
  abrirDenuncia: AbrirDenunciaDeBaja;
}

/** El archivo se muestra en el navegador, sin guardarse en caché y con un nombre que arma el servidor. */
function enviarDocumento(respuesta: FastifyReply, archivo: DocumentoDeBajaAbierto) {
  return respuesta
    .header('Content-Type', archivo.tipoMime)
    .header('Content-Disposition', `inline; filename="${archivo.nombre}"`)
    .header('Cache-Control', 'private, no-store')
    .send(archivo.contenido);
}

/** Traduce las peticiones HTTP de las bajas y ventas a casos de uso; no contiene reglas de negocio. */
export class BajasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeBajas) {}

  registrar = async (solicitud: FastifyRequest<{ Body: BajaSolicitada }>, respuesta: FastifyReply) => {
    const { darDeBaja, registrarVenta } = this.casosDeUso;
    const casoDeUso = solicitud.body.causa === 'venta' ? registrarVenta : darDeBaja;
    const baja = await casoDeUso.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(baja);
  };

  anular = (solicitud: FastifyRequest<{ Params: ParamsBaja; Body: AnulacionDeBajaSolicitada }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      bajaId: solicitud.params.id,
      motivo: solicitud.body.motivo,
    });

  obtener = (solicitud: FastifyRequest<{ Params: ParamsBaja }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.id);

  subirActa = async (solicitud: FastifyRequest<{ Params: ParamsBaja; Querystring: ConsultaDeActa }>) => {
    const { contenido, nombre } = await leerDocumentoDeSolicitud(solicitud);
    const { tipoDeActa } = solicitud.query;
    return this.casosDeUso.subirActa.ejecutar(operadorDe(solicitud), {
      bajaId: solicitud.params.id,
      contenido,
      nombre,
      tipoDeActa,
    });
  };

  subirDenuncia = async (solicitud: FastifyRequest<{ Params: ParamsBaja }>) => {
    const { contenido, nombre } = await leerDocumentoDeSolicitud(solicitud);
    return this.casosDeUso.subirDenuncia.ejecutar(operadorDe(solicitud), {
      bajaId: solicitud.params.id,
      contenido,
      nombre,
    });
  };

  abrirActa = async (solicitud: FastifyRequest<{ Params: ParamsBaja }>, respuesta: FastifyReply) =>
    enviarDocumento(respuesta, await this.casosDeUso.abrirActa.ejecutar(operadorDe(solicitud), solicitud.params.id));

  abrirDenuncia = async (solicitud: FastifyRequest<{ Params: ParamsBaja }>, respuesta: FastifyReply) =>
    enviarDocumento(
      respuesta,
      await this.casosDeUso.abrirDenuncia.ejecutar(operadorDe(solicitud), solicitud.params.id),
    );
}
