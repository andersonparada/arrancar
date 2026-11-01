import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { AnularDocumento } from '../aplicacion/casos-uso/acciones/anular-documento.js';
import { EliminarDocumento } from '../aplicacion/casos-uso/acciones/eliminar-documento.js';
import { BajasControlador } from '../http/bajas.controlador.js';
import { rutasDeBajas } from '../http/bajas.rutas.js';
import { LibroDeComprasEnMediador } from '../infraestructura/libro-de-compras-en-mediador.js';
import { ConsultasDeDocumentosDrizzle } from '../infraestructura/persistencia/consultas-de-documentos.drizzle.js';
import { DocumentosDeCompraDrizzle } from '../infraestructura/persistencia/documentos-de-compra.drizzle.js';
import { RepositorioDeAplicacionesDrizzle } from '../infraestructura/persistencia/repositorio-de-aplicaciones.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos.drizzle.js';

/** Raíz de composición de las bajas que nacen en Cuentas por pagar: anular y eliminar un documento. */
export function rutasDeBajasComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo, reloj, auditoria, publicadorEventos } = dependenciasCompartidas();
  const aplicaciones = new RepositorioDeAplicacionesDrizzle();
  const dependencias = {
    unidadDeTrabajo,
    reloj,
    auditoria,
    publicadorEventos,
    aplicaciones,
    documentos: new RepositorioDeDocumentosDrizzle(aplicaciones),
    consultas: new ConsultasDeDocumentosDrizzle(),
    libroDeCompras: new LibroDeComprasEnMediador(),
    documentosDeCompra: new DocumentosDeCompraDrizzle(),
  };
  return rutasDeBajas(
    new BajasControlador({ anular: new AnularDocumento(dependencias), eliminar: new EliminarDocumento(dependencias) }),
  );
}
