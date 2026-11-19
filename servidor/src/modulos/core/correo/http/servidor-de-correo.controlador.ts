import type { FastifyRequest } from 'fastify';
import { contextoDe } from '../../compartido/http/contexto-de-la-solicitud.js';
import type { EnviarPrueba } from '../aplicacion/casos-uso/enviar-prueba.js';
import type { GuardarServidorDeCorreo } from '../aplicacion/casos-uso/guardar-servidor-de-correo.js';
import type { ObtenerServidorDeCorreo } from '../aplicacion/casos-uso/obtener-servidor-de-correo.js';
import type { Solicitante } from '../aplicacion/solicitante.js';
import type { PruebaDeCorreoSolicitada, ServidorDeCorreoSolicitado } from './servidor-de-correo.esquemas-http.js';

export interface CasosDeUsoDelServidorDeCorreo {
  obtener: ObtenerServidorDeCorreo;
  guardar: GuardarServidorDeCorreo;
  enviarPrueba: EnviarPrueba;
}

const solicitanteDe = (solicitud: FastifyRequest): Solicitante => ({
  usuarioId: contextoDe(solicitud).usuario.id,
  direccionIp: solicitud.ip,
});

export class ServidorDeCorreoControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDelServidorDeCorreo) {}

  obtener = () => this.casosDeUso.obtener.ejecutar();

  guardar = (solicitud: FastifyRequest<{ Body: ServidorDeCorreoSolicitado }>) =>
    this.casosDeUso.guardar.ejecutar(solicitanteDe(solicitud), solicitud.body);

  probar = (solicitud: FastifyRequest<{ Body: PruebaDeCorreoSolicitada }>) =>
    this.casosDeUso.enviarPrueba.ejecutar(solicitanteDe(solicitud), solicitud.body.destino);
}
