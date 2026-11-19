import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AccesoDenegado } from '../../core/compartido/aplicacion/errores.js';
import { proteger } from '../../core/compartido/http/guardias.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ObtenerCatalogos } from '../aplicacion/casos-uso/catalogos/obtener-catalogos.js';

/** Quien abre, edita, mueve el monto, registra vales o repone necesita elegir cuentas, chequeras, custodios y conceptos. */
const PERMISOS_QUE_ELIGEN = [
  'caja-chica.fondos.crear',
  'caja-chica.fondos.editar',
  'caja-chica.fondos.cambiar-monto',
  'caja-chica.comprobantes.crear',
  'caja-chica.reposiciones.crear',
];

async function soloQuienElige(solicitud: FastifyRequest): Promise<void> {
  const permisos = solicitud.contexto?.permisos;
  if (!PERMISOS_QUE_ELIGEN.some((permiso) => permisos?.has(permiso))) throw new AccesoDenegado();
}

/**
 * `GET /caja-chica/catalogos`: lo que se elige en las ventanas de Caja chica, sin pedir los permisos de Bancos, Empresas,
 * Libro de compras ni Usuarios (PLAN §9.1). Pide ver los fondos y alguno de los permisos que operan con ellos.
 */
export function rutasDeCatalogos(obtener: ObtenerCatalogos): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/caja-chica/catalogos', {
      schema: { tags: ['Caja chica'] },
      preHandler: [proteger({ permiso: 'caja-chica.fondos.ver' }), soloQuienElige],
      handler: (solicitud) => obtener.ejecutar(operadorDe(solicitud)),
    });
  };
}
