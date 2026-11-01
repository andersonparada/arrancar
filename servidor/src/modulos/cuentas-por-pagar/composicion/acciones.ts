import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { AutorizarDocumentos } from '../aplicacion/casos-uso/acciones/autorizar-documentos.js';
import { CambiarVencimiento } from '../aplicacion/casos-uso/acciones/cambiar-vencimiento.js';
import { CompletarDocumentos } from '../aplicacion/casos-uso/acciones/completar-documentos.js';
import { DesautorizarDocumento } from '../aplicacion/casos-uso/acciones/desautorizar-documento.js';
import { AccionesControlador } from '../http/acciones.controlador.js';
import { rutasDeAcciones } from '../http/acciones.rutas.js';
import { LibroDeComprasEnMediador } from '../infraestructura/libro-de-compras-en-mediador.js';
import { ConsultasDeDocumentosDrizzle } from '../infraestructura/persistencia/consultas-de-documentos.drizzle.js';
import { RepositorioDeAplicacionesDrizzle } from '../infraestructura/persistencia/repositorio-de-aplicaciones.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos.drizzle.js';

/** Raíz de composición de las acciones sobre un documento: completar, autorizar, desautorizar y cambiar el vencimiento. */
export function rutasDeAccionesComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo, reloj, auditoria, publicadorEventos } = dependenciasCompartidas();
  const documentos = new RepositorioDeDocumentosDrizzle(new RepositorioDeAplicacionesDrizzle());
  const dependencias = { unidadDeTrabajo, reloj, documentos, consultas: new ConsultasDeDocumentosDrizzle() };
  const conAutorizacion = {
    ...dependencias,
    auditoria,
    publicadorEventos,
    libroDeCompras: new LibroDeComprasEnMediador(),
  };
  return rutasDeAcciones(
    new AccionesControlador({
      completar: new CompletarDocumentos(dependencias),
      cambiarVencimiento: new CambiarVencimiento(dependencias),
      autorizar: new AutorizarDocumentos(conAutorizacion),
      desautorizar: new DesautorizarDocumento(conAutorizacion),
    }),
  );
}
