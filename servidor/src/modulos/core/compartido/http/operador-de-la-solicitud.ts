import type { FastifyRequest } from 'fastify';
import { contextoDe, empresaActivaDe } from './contexto-de-la-solicitud.js';
import type { Operador } from '../aplicacion/operador.js';

/** Quién hace la petición y con qué empresa trabaja; exige que haya una empresa activa. */
export function operadorDe(solicitud: FastifyRequest): Operador {
  return { ...empresaActivaDe(solicitud), esSuperacceso: contextoDe(solicitud).usuario.esSuperacceso };
}
