import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AccesoDenegado } from '../../core/compartido/aplicacion/errores.js';
import { proteger } from '../../core/compartido/http/guardias.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ObtenerCatalogos } from '../aplicacion/casos-uso/catalogos/obtener-catalogos.js';

/** Quien registra o edita una parcela necesita elegir su localidad y los inmuebles que abarca. */
const PERMISOS_QUE_ELIGEN = ['parcelas.parcelas.crear', 'parcelas.parcelas.editar'];

async function soloQuienElige(solicitud: FastifyRequest): Promise<void> {
  const permisos = solicitud.contexto?.permisos;
  if (!PERMISOS_QUE_ELIGEN.some((permiso) => permisos?.has(permiso))) throw new AccesoDenegado();
}

/**
 * `GET /parcelas/catalogos`: las localidades y los inmuebles del formulario de parcelas, sin pedir los permisos de
 * Empresas. Pide ver las parcelas y poder crearlas o editarlas.
 */
export function rutasDeCatalogos(obtener: ObtenerCatalogos): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/parcelas/catalogos', {
      schema: { tags: ['Parcelas'] },
      preHandler: [proteger({ permiso: 'parcelas.parcelas.ver' }), soloQuienElige],
      handler: (solicitud) => obtener.ejecutar(operadorDe(solicitud)),
    });
  };
}
