import type { FastifyRequest } from 'fastify';
import { AccesoDenegado } from '../aplicacion/errores.js';
import type { Operador } from '../aplicacion/operador.js';
import { contextoDe } from './contexto-de-la-solicitud.js';
import { operadorDe } from './operador-de-la-solicitud.js';

/**
 * Operador de la ventana de asignación de un recurso con alcance: además de lo normal, la
 * transacción abre `app.alcance_para_asignar` (lectura de todos los registros y escritura de la
 * tabla de accesos, nada más). **Solo** lo usan los casos de uso de esa ventana; es el único
 * lugar que llena `recursosParaAsignar`.
 * @throws AccesoDenegado si la sesión no tiene el permiso de asignar del recurso.
 */
export function operadorParaAsignar(solicitud: FastifyRequest, recurso: string): Operador {
  if (!contextoDe(solicitud).recursosParaAsignar.includes(recurso)) throw new AccesoDenegado();
  return { ...operadorDe(solicitud), recursosParaAsignar: [recurso] };
}
