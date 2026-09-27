import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll } from 'vitest';
import { construirAplicacion } from '../../aplicacion.js';
import { grupoConexiones } from '../../modulos/core/base-datos/conexion.js';
import { CREDENCIALES_SOPORTE, prepararBaseDeDatos } from './base-datos-de-prueba.js';
import { ClienteApi } from './cliente-api.js';

export interface EntornoApi {
  app: FastifyInstance;
  /** Usuario de soporte (superacceso) con la sesión ya iniciada. */
  soporte: ClienteApi;
  /** Un navegador nuevo, sin sesión. */
  nuevoCliente(): ClienteApi;
}

/**
 * Prepara, para todo el archivo de pruebas, una base limpia y la aplicación
 * completa escuchando en memoria. Cada archivo arranca su propia aplicación, así
 * que el límite de intentos de inicio de sesión no se comparte entre archivos.
 */
export function usarEntornoApi(): EntornoApi {
  const entorno = { nuevoCliente: () => new ClienteApi(entorno.app) } as EntornoApi;

  beforeAll(async () => {
    await prepararBaseDeDatos();
    entorno.app = await construirAplicacion();
    await entorno.app.ready();
    entorno.soporte = entorno.nuevoCliente();
    await entorno.soporte.iniciarSesion(CREDENCIALES_SOPORTE.usuario, CREDENCIALES_SOPORTE.contrasena);
  });

  afterAll(async () => {
    await entorno.app?.close();
    await grupoConexiones.end();
  });

  return entorno;
}
