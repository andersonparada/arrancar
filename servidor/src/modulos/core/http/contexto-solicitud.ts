import type { FastifyRequest } from 'fastify';
import { ErrorNoAutenticado, ErrorSolicitudInvalida } from '../errores/errores.js';
import type { ContextoEmpresa } from '../base-datos/contexto-empresa.js';

export interface UsuarioSesion {
  id: string;
  usuario: string;
  nombre: string;
  esSuperacceso: boolean;
}

export interface EmpresaSesion {
  id: string;
  nombre: string;
  cuentaId: string;
  cuentaNombre: string;
}

/** Todo lo que una ruta necesita saber de quién hace la petición y sobre qué empresa. */
export interface ContextoSolicitud {
  sesionId: string;
  usuario: UsuarioSesion;
  empresa: EmpresaSesion | null;
  rolNombre: string | null;
  modulosActivos: ReadonlySet<string>;
  permisos: ReadonlySet<string>;
  /** Recursos con alcance que el usuario ve completos (ver `politicaPorAlcance`). */
  recursosAlcanceTotal: readonly string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    contexto: ContextoSolicitud | null;
    tokenSesion: string | null;
  }
}

/** Contexto de la petición; solo es nulo en rutas públicas. */
export function contextoDe(solicitud: FastifyRequest): ContextoSolicitud {
  if (!solicitud.contexto) throw new ErrorNoAutenticado();
  return solicitud.contexto;
}

/** Datos para `ejecutarEnEmpresa`, con la cuenta de la empresa activa. */
export function empresaActivaDe(solicitud: FastifyRequest): ContextoEmpresa {
  const contexto = contextoDe(solicitud);
  if (!contexto.empresa) throw new ErrorSolicitudInvalida('Seleccione una empresa para continuar.');
  return {
    empresaId: contexto.empresa.id,
    usuarioId: contexto.usuario.id,
    cuentaId: contexto.empresa.cuentaId,
    recursosAlcanceTotal: contexto.recursosAlcanceTotal,
  };
}
