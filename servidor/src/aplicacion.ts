import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { configuracion, esProduccion, esPrueba } from './configuracion.js';
import { cargarConfiguracionInstalacion } from './modulos/core/configuracion/instalacion.js';
import { ErrorSinPermiso } from './modulos/core/errores/errores.js';
import { manejarError } from './modulos/core/errores/manejador-errores.js';
import { establecerRegistroModulos } from './modulos/core/modulos-sistema/registro-global.js';
import { RegistroModulos } from './modulos/core/modulos-sistema/registro-modulos.js';
import { definicionesModulos } from './modulos/indice.js';

const TAMANO_MAXIMO_IMAGEN = 15 * 1024 * 1024;
const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Rechaza peticiones que modifican datos desde otro origen (defensa CSRF adicional
 * a la cookie SameSite=Lax).
 */
function verificarOrigen(app: FastifyInstance): void {
  const origenPermitido = new URL(configuracion.URL_PUBLICA).origin;
  app.addHook('onRequest', async (solicitud) => {
    if (METODOS_SEGUROS.has(solicitud.method)) return;
    const origen = solicitud.headers.origin;
    if (origen && origen !== origenPermitido) throw new ErrorSinPermiso('Origen no permitido.');
  });
}

/**
 * Sirve la PWA compilada (si existe) y devuelve `index.html` en cualquier ruta
 * que no sea de la API. Las rutas inexistentes de la API responden 404 en JSON.
 */
async function servirCliente(app: FastifyInstance): Promise<void> {
  const rutaCliente = configuracion.RUTA_CLIENTE ? resolve(configuracion.RUTA_CLIENTE) : null;
  const hayCliente = rutaCliente !== null && existsSync(rutaCliente);
  if (hayCliente) await app.register(fastifyStatic, { root: rutaCliente, wildcard: false });

  app.setNotFoundHandler((solicitud, respuesta) => {
    if (!hayCliente || solicitud.url.startsWith('/api/') || solicitud.method !== 'GET') {
      return respuesta.status(404).send({ error: { codigo: 'no_encontrado', mensaje: 'Ruta no encontrada.' } });
    }
    return respuesta.header('Cache-Control', 'no-cache').sendFile('index.html');
  });
}

/**
 * Arma la aplicación: plugins de seguridad, validación con Zod, documentación y
 * las rutas de todos los módulos instalados bajo `/api`.
 */
function opcionesDeRegistro() {
  if (esPrueba) return false;
  if (esProduccion) return { level: 'info' };
  return { level: 'debug', transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss' } } };
}

export async function construirAplicacion(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opcionesDeRegistro(),
    trustProxy: esProduccion,
    disableRequestLogging: !esProduccion,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(manejarError);
  app.decorateRequest('contexto', null);
  app.decorateRequest('tokenSesion', null);

  const registro = new RegistroModulos(definicionesModulos);
  establecerRegistroModulos(registro);
  cargarConfiguracionInstalacion(configuracion.RUTA_CONFIG_INSTALACION, registro);

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
      },
    },
  });
  await app.register(rateLimit, { global: false });
  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: TAMANO_MAXIMO_IMAGEN, files: 1 } });
  verificarOrigen(app);

  if (!esProduccion) {
    await app.register(swagger, {
      openapi: { info: { title: 'Arrancar API', version: '0.1.0' } },
      transform: jsonSchemaTransform,
    });
    await app.register(swaggerUi, { routePrefix: '/api/documentacion' });
  }

  await app.register(
    async (api) => {
      for (const modulo of definicionesModulos) {
        if (modulo.rutas) await api.register(modulo.rutas);
      }
      api.get('/salud', async () => ({ estado: 'ok' }));
    },
    { prefix: '/api' },
  );

  await servirCliente(app);
  return app;
}
