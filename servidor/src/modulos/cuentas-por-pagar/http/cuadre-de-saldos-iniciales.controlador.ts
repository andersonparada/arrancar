import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ObtenerCuadreDeSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/obtener-cuadre-de-saldos-iniciales.js';

/** Traduce la petición del cuadre a su caso de uso. */
export class CuadreDeSaldosInicialesControlador {
  constructor(private readonly obtenerCuadre: ObtenerCuadreDeSaldosIniciales) {}

  cuadre = (solicitud: FastifyRequest) => this.obtenerCuadre.ejecutar(operadorDe(solicitud));
}
