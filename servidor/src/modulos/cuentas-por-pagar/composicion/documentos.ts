import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { RecibirDocumento } from '../aplicacion/casos-uso/recibir-documento.js';
import { ConsultasDeCargosDrizzle } from '../infraestructura/persistencia/consultas-de-cargos.drizzle.js';
import { CondicionesDeProveedoresDrizzle } from '../infraestructura/persistencia/condiciones-de-proveedores.drizzle.js';
import { RepositorioDeAplicacionesDrizzle } from '../infraestructura/persistencia/repositorio-de-aplicaciones.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos.drizzle.js';
import { PlazoPorOmisionEnConfiguracion } from '../infraestructura/plazo-por-omision-en-configuracion.js';
import { atenderOrdenesDeDocumentos } from './ordenes-de-documentos.js';

/**
 * Raíz de composición de los documentos por pagar: el único lugar donde se eligen las implementaciones concretas.
 * Registra lo que el módulo atiende en el mediador; las rutas propias llegan con los pasos de consulta y autorización.
 */
export function rutasDeDocumentosComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo } = dependenciasCompartidas();
  atenderOrdenesDeDocumentos({
    recibir: new RecibirDocumento({
      unidadDeTrabajo,
      documentos: new RepositorioDeDocumentosDrizzle(),
      aplicaciones: new RepositorioDeAplicacionesDrizzle(),
      cargos: new ConsultasDeCargosDrizzle(),
      condiciones: new CondicionesDeProveedoresDrizzle(),
      plazo: new PlazoPorOmisionEnConfiguracion(),
    }),
  });
  return async () => {};
}
