import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { ErrorNoAutenticado, ErrorSinPermiso, ErrorSolicitudInvalida } from '../errores/errores.js';
import { obtenerRegistroModulos } from '../modulos-sistema/registro-global.js';
import { autenticacionServicio } from '../servicios/autenticacion.servicio.js';
import { sesionServicio } from '../servicios/sesion.servicio.js';
import { escribirCookieSesion, leerCookieSesion } from './cookie-sesion.js';

/**
 * Eslabón de la cadena de verificación de una petición (patrón Chain of Responsibility).
 * Cada guardia valida una sola condición y, si se cumple, pasa al siguiente eslabón;
 * si no, corta la cadena lanzando un error.
 */
export abstract class Guardia {
  private siguiente: Guardia | null = null;

  /** Enlaza el siguiente eslabón y lo devuelve para poder encadenar llamadas. */
  enlazar(siguiente: Guardia): Guardia {
    this.siguiente = siguiente;
    return siguiente;
  }

  async manejar(solicitud: FastifyRequest, respuesta: FastifyReply): Promise<void> {
    await this.verificar(solicitud, respuesta);
    await this.siguiente?.manejar(solicitud, respuesta);
  }

  protected abstract verificar(solicitud: FastifyRequest, respuesta: FastifyReply): Promise<void>;
}

/** Valida la cookie de sesión y deja el contexto del usuario en la petición. */
export class GuardiaAutenticacion extends Guardia {
  protected async verificar(solicitud: FastifyRequest, respuesta: FastifyReply): Promise<void> {
    const token = leerCookieSesion(solicitud);
    const sesion = token ? await autenticacionServicio.validarToken(token) : undefined;
    if (!token || !sesion) throw new ErrorNoAutenticado();

    if (sesion.renovada) escribirCookieSesion(respuesta, token, sesion.expiraEn);
    solicitud.tokenSesion = token;
    solicitud.contexto = await sesionServicio.construirContexto(sesion);
  }
}

export class GuardiaSuperacceso extends Guardia {
  protected async verificar(solicitud: FastifyRequest): Promise<void> {
    if (!solicitud.contexto?.usuario.esSuperacceso) throw new ErrorSinPermiso('Solo el equipo de soporte puede hacer esto.');
  }
}

export class GuardiaEmpresaActiva extends Guardia {
  protected async verificar(solicitud: FastifyRequest): Promise<void> {
    if (!solicitud.contexto?.empresa) throw new ErrorSolicitudInvalida('Seleccione una empresa para continuar.');
  }
}

export class GuardiaModulo extends Guardia {
  constructor(private readonly clave: string) {
    super();
  }

  protected async verificar(solicitud: FastifyRequest): Promise<void> {
    if (!solicitud.contexto?.modulosActivos.has(this.clave)) {
      const nombre = obtenerRegistroModulos().obtener(this.clave)?.nombre ?? this.clave;
      throw new ErrorSinPermiso(`El módulo ${nombre} no está activo para esta cuenta.`);
    }
  }
}

export class GuardiaPermiso extends Guardia {
  constructor(private readonly permiso: string) {
    super();
  }

  protected async verificar(solicitud: FastifyRequest): Promise<void> {
    if (!solicitud.contexto?.permisos.has(this.permiso)) throw new ErrorSinPermiso();
  }
}

export interface OpcionesProteccion {
  /** Exige una empresa activa en la sesión. Por defecto es `true`. */
  requiereEmpresa?: boolean;
  soloSuperacceso?: boolean;
  /** Permiso requerido; el módulo se deduce del permiso. */
  permiso?: string;
}

/**
 * Arma la cadena de guardias de una ruta: autenticación → superacceso → empresa → módulo → permiso.
 * @example { preHandler: proteger({ permiso: 'usuarios.gestionar' }) }
 */
export function proteger(opciones: OpcionesProteccion = {}): preHandlerAsyncHookHandler {
  const primera = new GuardiaAutenticacion();
  let ultima: Guardia = primera;

  if (opciones.soloSuperacceso) ultima = ultima.enlazar(new GuardiaSuperacceso());
  if (opciones.requiereEmpresa ?? !opciones.soloSuperacceso) ultima = ultima.enlazar(new GuardiaEmpresaActiva());
  if (opciones.permiso) {
    const modulo = obtenerRegistroModulos().moduloDelPermiso(opciones.permiso);
    if (!modulo) throw new Error(`El permiso "${opciones.permiso}" no está declarado por ningún módulo.`);
    ultima = ultima.enlazar(new GuardiaModulo(modulo)).enlazar(new GuardiaPermiso(opciones.permiso));
  }

  return async (solicitud, respuesta) => primera.manejar(solicitud, respuesta);
}
