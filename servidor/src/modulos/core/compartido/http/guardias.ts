import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { obtenerRegistroModulos } from '../../modulos-sistema/registro-global.js';
import type { ValidadorDeSesion } from '../aplicacion/contexto-de-sesion.js';
import { AccesoDenegado, NoAutenticado } from '../aplicacion/errores.js';
import { FaltaLaEmpresaActiva } from './contexto-de-la-solicitud.js';
import { escribirCookieSesion, leerCookieSesion } from './cookie-de-sesion.js';

let validadorDeSesion: ValidadorDeSesion | null = null;

/** Identidad lo entrega al armarse; así el núcleo no depende de cómo se guardan las sesiones. */
export function usarValidadorDeSesion(validador: ValidadorDeSesion): void {
  validadorDeSesion = validador;
}

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
    if (!validadorDeSesion) throw new Error('Falta el validador de sesión: identidad no se armó.');
    const token = leerCookieSesion(solicitud);
    const sesion = token ? await validadorDeSesion.validar(token) : null;
    if (!token || !sesion) throw new NoAutenticado();

    if (sesion.renovadaHasta) escribirCookieSesion(respuesta, token, sesion.renovadaHasta);
    solicitud.tokenSesion = token;
    solicitud.contexto = sesion.contexto;
  }
}

export class GuardiaSuperacceso extends Guardia {
  protected async verificar(solicitud: FastifyRequest): Promise<void> {
    if (!solicitud.contexto?.usuario.esSuperacceso) {
      throw new AccesoDenegado('Solo el equipo de soporte puede hacer esto.');
    }
  }
}

export class GuardiaEmpresaActiva extends Guardia {
  protected async verificar(solicitud: FastifyRequest): Promise<void> {
    if (!solicitud.contexto?.empresa) throw new FaltaLaEmpresaActiva();
  }
}

export class GuardiaModulo extends Guardia {
  constructor(private readonly clave: string) {
    super();
  }

  protected async verificar(solicitud: FastifyRequest): Promise<void> {
    if (!solicitud.contexto?.modulosActivos.has(this.clave)) {
      const nombre = obtenerRegistroModulos().obtener(this.clave)?.nombre ?? this.clave;
      throw new AccesoDenegado(`El módulo ${nombre} no está activo para esta cuenta.`);
    }
  }
}

export class GuardiaPermiso extends Guardia {
  constructor(private readonly permiso: string) {
    super();
  }

  protected async verificar(solicitud: FastifyRequest): Promise<void> {
    if (!solicitud.contexto?.permisos.has(this.permiso)) throw new AccesoDenegado();
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
 * @example { preHandler: proteger({ permiso: 'usuarios.crear' }) }
 */
export function proteger(opciones: OpcionesProteccion = {}): preHandlerAsyncHookHandler {
  const [primera, ...siguientes] = guardiasEnOrden(opciones);
  siguientes.reduce((anterior, guardia) => anterior.enlazar(guardia), primera);
  return async (solicitud, respuesta) => primera.manejar(solicitud, respuesta);
}

function guardiasEnOrden(opciones: OpcionesProteccion): [Guardia, ...Guardia[]] {
  const guardias: [Guardia, ...Guardia[]] = [new GuardiaAutenticacion()];
  if (opciones.soloSuperacceso) guardias.push(new GuardiaSuperacceso());
  if (opciones.requiereEmpresa ?? !opciones.soloSuperacceso) guardias.push(new GuardiaEmpresaActiva());
  if (opciones.permiso) guardias.push(...guardiasDePermiso(opciones.permiso));
  return guardias;
}

/** Un permiso exige, además, que su módulo esté activo en la cuenta. */
function guardiasDePermiso(permiso: string): Guardia[] {
  const modulo = obtenerRegistroModulos().moduloDelPermiso(permiso);
  if (!modulo) throw new Error(`El permiso "${permiso}" no está declarado por ningún módulo.`);
  return [new GuardiaModulo(modulo), new GuardiaPermiso(permiso)];
}
