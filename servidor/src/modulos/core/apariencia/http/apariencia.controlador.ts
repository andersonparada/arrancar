import type { FastifyReply, FastifyRequest } from 'fastify';
import { leerImagenDeSolicitud } from '../../compartido/http/leer-imagen.js';
import { contextoDe } from '../../compartido/http/contexto-de-la-solicitud.js';
import type { AbrirLogo } from '../aplicacion/casos-uso/abrir-logo.js';
import type { CambiarApariencia } from '../aplicacion/casos-uso/cambiar-apariencia.js';
import type { CambiarLogo } from '../aplicacion/casos-uso/cambiar-logo.js';
import type { ObtenerApariencia } from '../aplicacion/casos-uso/obtener-apariencia.js';
import type { QuitarLogo } from '../aplicacion/casos-uso/quitar-logo.js';
import type { RestablecerApariencia } from '../aplicacion/casos-uso/restablecer-apariencia.js';
import type { AparienciaSolicitada, ConsultaLogo } from './apariencia.esquemas-http.js';

export interface CasosDeUsoDeApariencia {
  obtener: ObtenerApariencia;
  cambiar: CambiarApariencia;
  restablecer: RestablecerApariencia;
  abrirLogo: AbrirLogo;
  cambiarLogo: CambiarLogo;
  quitarLogo: QuitarLogo;
}

const usuarioDe = (solicitud: FastifyRequest) => contextoDe(solicitud).usuario.id;

export class AparienciaControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeApariencia) {}

  obtener = () => this.casosDeUso.obtener.ejecutar();

  cambiar = (solicitud: FastifyRequest<{ Body: AparienciaSolicitada }>) =>
    this.casosDeUso.cambiar.ejecutar(solicitud.body, usuarioDe(solicitud));

  restablecer = () => this.casosDeUso.restablecer.ejecutar();

  /** Con versión, el logo se guarda en caché para siempre; sin ella, se revisa cada vez. */
  obtenerLogo = async (solicitud: FastifyRequest<{ Querystring: ConsultaLogo }>, respuesta: FastifyReply) => {
    const contenido = await this.casosDeUso.abrirLogo.ejecutar();
    const cache = solicitud.query.v ? 'public, max-age=31536000, immutable' : 'no-cache';
    return respuesta.header('Content-Type', 'image/png').header('Cache-Control', cache).send(contenido);
  };

  cambiarLogo = async (solicitud: FastifyRequest) =>
    this.casosDeUso.cambiarLogo.ejecutar(await leerImagenDeSolicitud(solicitud), usuarioDe(solicitud));

  quitarLogo = () => this.casosDeUso.quitarLogo.ejecutar();
}
