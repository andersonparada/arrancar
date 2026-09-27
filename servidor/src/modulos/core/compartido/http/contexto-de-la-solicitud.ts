import type { FastifyRequest } from 'fastify';
import type { ContextoDeSesion } from '../aplicacion/contexto-de-sesion.js';
import type { ContextoEmpresa } from '../aplicacion/contexto-empresa.js';
import { NoAutenticado } from '../aplicacion/errores.js';
import { DatoInvalido } from '../dominio/errores.js';

declare module 'fastify' {
  interface FastifyRequest {
    contexto: ContextoDeSesion | null;
    tokenSesion: string | null;
  }
}

export class FaltaLaEmpresaActiva extends DatoInvalido {
  readonly codigo = 'falta_la_empresa_activa';

  constructor() {
    super('Seleccione una empresa para continuar.');
  }
}

/** Contexto de la petición; solo es nulo en rutas públicas. */
export function contextoDe(solicitud: FastifyRequest): ContextoDeSesion {
  if (!solicitud.contexto) throw new NoAutenticado();
  return solicitud.contexto;
}

/** @throws FaltaLaEmpresaActiva si la sesión aún no eligió empresa. */
export function empresaActivaDe(solicitud: FastifyRequest): ContextoEmpresa {
  const contexto = contextoDe(solicitud);
  if (!contexto.empresa) throw new FaltaLaEmpresaActiva();
  return {
    empresaId: contexto.empresa.id,
    usuarioId: contexto.usuario.id,
    cuentaId: contexto.empresa.cuentaId,
    recursosAlcanceTotal: contexto.recursosAlcanceTotal,
  };
}
