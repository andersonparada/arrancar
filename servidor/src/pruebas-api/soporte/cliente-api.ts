import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { imagenMultipart, type Imagen } from './imagenes.js';

const NOMBRE_COOKIE_SESION = 'arrancar_sesion';

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface Respuesta<Cuerpo = any> {
  estado: number;
  cuerpo: Cuerpo;
  cabeceras: LightMyRequestResponse['headers'];
}

interface Peticion {
  metodo: Metodo;
  url: string;
  cuerpo?: unknown;
  cabeceras?: Record<string, string>;
}

function leerCuerpo(respuesta: LightMyRequestResponse): unknown {
  const esJson = String(respuesta.headers['content-type'] ?? '').includes('application/json');
  return esJson && respuesta.body ? respuesta.json() : respuesta.rawPayload;
}

/**
 * Navegador simulado para las pruebas de la API: guarda la cookie de sesión que
 * entrega el servidor y la envía en cada petición, igual que el navegador real.
 */
export class ClienteApi {
  private cookieSesion: string | null = null;

  constructor(private readonly app: FastifyInstance) {}

  get tieneSesion(): boolean {
    return this.cookieSesion !== null;
  }

  iniciarSesion(usuario: string, contrasena: string): Promise<Respuesta> {
    return this.post('/api/autenticacion/iniciar-sesion', { usuario, contrasena });
  }

  get<Cuerpo = any>(url: string): Promise<Respuesta<Cuerpo>> {
    return this.enviar({ metodo: 'GET', url });
  }

  post<Cuerpo = any>(url: string, cuerpo?: unknown): Promise<Respuesta<Cuerpo>> {
    return this.enviar({ metodo: 'POST', url, cuerpo });
  }

  put<Cuerpo = any>(url: string, cuerpo?: unknown): Promise<Respuesta<Cuerpo>> {
    return this.enviar({ metodo: 'PUT', url, cuerpo });
  }

  patch<Cuerpo = any>(url: string, cuerpo?: unknown): Promise<Respuesta<Cuerpo>> {
    return this.enviar({ metodo: 'PATCH', url, cuerpo });
  }

  delete<Cuerpo = any>(url: string, cuerpo?: unknown): Promise<Respuesta<Cuerpo>> {
    return this.enviar({ metodo: 'DELETE', url, cuerpo });
  }

  subirImagen<Cuerpo = any>(metodo: 'POST' | 'PUT', url: string, imagen: Imagen): Promise<Respuesta<Cuerpo>> {
    const { cuerpo, tipoContenido } = imagenMultipart(imagen);
    return this.enviar({ metodo, url, cuerpo, cabeceras: { 'content-type': tipoContenido } });
  }

  /** Envía la petición como si viniera de otro sitio web (para probar la defensa CSRF). */
  postDesdeOtroOrigen(url: string, cuerpo: unknown, origen: string): Promise<Respuesta> {
    return this.enviar({ metodo: 'POST', url, cuerpo, cabeceras: { origin: origen } });
  }

  private async enviar<Cuerpo>(peticion: Peticion): Promise<Respuesta<Cuerpo>> {
    const respuesta = await this.app.inject({
      method: peticion.metodo,
      url: peticion.url,
      payload: peticion.cuerpo as string | object | Buffer | undefined,
      headers: { ...this.cabeceraCookie(), ...peticion.cabeceras },
    });
    this.recordarCookie(respuesta);
    return { estado: respuesta.statusCode, cuerpo: leerCuerpo(respuesta) as Cuerpo, cabeceras: respuesta.headers };
  }

  private cabeceraCookie(): Record<string, string> {
    return this.cookieSesion ? { cookie: `${NOMBRE_COOKIE_SESION}=${this.cookieSesion}` } : {};
  }

  private recordarCookie(respuesta: LightMyRequestResponse): void {
    const cookie = respuesta.cookies.find((c) => c.name === NOMBRE_COOKIE_SESION);
    if (!cookie) return;
    const fueBorrada = !cookie.value || (cookie.expires !== undefined && cookie.expires.getTime() <= Date.now());
    this.cookieSesion = fueBorrada ? null : cookie.value;
  }
}
