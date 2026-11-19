import type { FastifyRequest } from 'fastify';
import { contextoDe } from '../../core/compartido/http/contexto-de-la-solicitud.js';
import type { VistaDelKardex } from '../aplicacion/dto/documento.dto.js';

export const PERMISO_VER_COSTOS = 'inventarios.costos.ver';
const RECURSO_DE_BODEGAS = 'inventarios.bodegas';

/** Quién mira: si ve costos (`costos.ver`) y si ve todas las bodegas (alcance total). El servidor recorta los DTO. */
export function vistaDe(solicitud: FastifyRequest): VistaDelKardex {
  const contexto = contextoDe(solicitud);
  return {
    verCostos: contexto.permisos.has(PERMISO_VER_COSTOS),
    veTodasLasBodegas: contexto.recursosAlcanceTotal?.includes(RECURSO_DE_BODEGAS) ?? false,
  };
}
