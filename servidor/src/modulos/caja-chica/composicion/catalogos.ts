import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { ObtenerCatalogos } from '../aplicacion/casos-uso/catalogos/obtener-catalogos.js';
import { rutasDeCatalogos } from '../http/catalogos.rutas.js';
import { ConsultasDeCatalogosDrizzle } from '../infraestructura/persistencia/consultas-de-catalogos.drizzle.js';

/** Raíz de composición de los catálogos que ofrece Caja chica a sus ventanas. */
export function rutasDeCatalogosComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo } = dependenciasCompartidas();
  return rutasDeCatalogos(new ObtenerCatalogos({ unidadDeTrabajo, consultas: new ConsultasDeCatalogosDrizzle() }));
}
