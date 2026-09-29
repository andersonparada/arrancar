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
import { archivoDeInstalacion } from './modulos/core/configuracion/infraestructura/archivo-de-instalacion.js';
import { AccesoDenegado } from './modulos/core/compartido/aplicacion/errores.js';
import { interpretarErrorDePostgres } from './modulos/core/compartido/infraestructura/errores-de-postgres.js';
import { crearManejadorDeErrores } from './modulos/core/compartido/http/manejador-errores.js';
import { respuestaDeLimiteExcedido } from './modulos/core/compartido/http/limite-de-solicitudes.js';
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
    if (origen && origen !== origenPermitido) throw new AccesoDenegado('Origen no permitido.');
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

/** En pruebas no se registra nada; en desarrollo, todo y legible; en producción, lo importante. */
function opcionesDeRegistro() {
  if (esPrueba) return false;
  if (esProduccion) return { level: 'info' };
  return { level: 'debug', transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss' } } };
}

/** Solo lo propio de la app: nada de otros sitios, salvo imágenes en línea y estilos de Vue. */
const POLITICA_DE_CONTENIDO = {
  directives: {
    defaultSrc: ["'self'"],
    imgSrc: ["'self'", 'data:', 'blob:'],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    connectSrc: ["'self'"],
    workerSrc: ["'self'"],
    manifestSrc: ["'self'"],
  },
};

/** Validación y respuesta con Zod, errores en un solo formato y el contexto de cada petición. */
function prepararPeticiones(app: FastifyInstance): void {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(crearManejadorDeErrores(interpretarErrorDePostgres));
  app.decorateRequest('contexto', null);
  app.decorateRequest('tokenSesion', null);
}

/** Registra los módulos instalados (valida lo que declaran) y lee la configuración de la instalación. */
function cargarModulos(): void {
  const registro = new RegistroModulos(definicionesModulos);
  establecerRegistroModulos(registro);
  archivoDeInstalacion.cargar(configuracion.RUTA_CONFIG_INSTALACION, registro);
}

/** Cabeceras de seguridad, límite de peticiones, cookies, subida de imágenes y defensa CSRF. */
async function registrarSeguridad(app: FastifyInstance): Promise<void> {
  await app.register(helmet, { contentSecurityPolicy: POLITICA_DE_CONTENIDO });
  await app.register(rateLimit, { global: false, errorResponseBuilder: respuestaDeLimiteExcedido });
  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: TAMANO_MAXIMO_IMAGEN, files: 1 } });
  verificarOrigen(app);
}

/** La documentación de la API en `/api/documentacion`, fuera de producción. */
async function registrarDocumentacion(app: FastifyInstance): Promise<void> {
  if (esProduccion) return;
  await app.register(swagger, {
    openapi: { info: { title: 'Arrancar API', version: '0.1.0' } },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/api/documentacion' });
}

/** Las rutas de todos los módulos instalados, bajo `/api`. */
async function registrarRutas(app: FastifyInstance): Promise<void> {
  await app.register(
    async (api) => {
      for (const modulo of definicionesModulos) {
        if (modulo.rutas) await api.register(modulo.rutas);
      }
      api.get('/salud', async () => ({ estado: 'ok' }));
    },
    { prefix: '/api' },
  );
}

/**
 * Arma la aplicación: plugins de seguridad, validación con Zod, documentación y
 * las rutas de todos los módulos instalados bajo `/api`.
 */
export async function construirAplicacion(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opcionesDeRegistro(),
    trustProxy: esProduccion,
    disableRequestLogging: !esProduccion,
  }).withTypeProvider<ZodTypeProvider>();

  prepararPeticiones(app);
  cargarModulos();
  await registrarSeguridad(app);
  await registrarDocumentacion(app);
  await registrarRutas(app);
  await servirCliente(app);
  return app;
}
