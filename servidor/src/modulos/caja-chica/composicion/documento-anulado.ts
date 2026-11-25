import type { FastifyPluginAsync } from 'fastify';
import {
  PonerEnDisputa,
  QuitarDeDisputa,
} from '../aplicacion/casos-uso/comprobantes/documento-anulado/disputa-del-documento-anulado.js';
import { ReemplazarDocumentoAnulado } from '../aplicacion/casos-uso/comprobantes/documento-anulado/reemplazar-documento-anulado.js';
import { ResolverDocumentoAnulado } from '../aplicacion/casos-uso/comprobantes/documento-anulado/resolver-documento-anulado.js';
import { DocumentoAnuladoControlador } from '../http/documento-anulado.controlador.js';
import { rutasDeDocumentoAnulado } from '../http/documento-anulado.rutas.js';
import { LibroParaReponerEnMediador } from '../infraestructura/apoyos-de-reposiciones.js';
import { dependenciasDeComprobantes } from './comprobantes.js';

/** Raíz de composición de lo que se hace con un documento anulado por su emisor. */
export function rutasDeDocumentoAnuladoComponidas(): FastifyPluginAsync {
  const dependencias = dependenciasDeComprobantes();
  return rutasDeDocumentoAnulado(
    new DocumentoAnuladoControlador({
      resolver: new ResolverDocumentoAnulado(dependencias),
      reemplazar: new ReemplazarDocumentoAnulado(dependencias, new LibroParaReponerEnMediador()),
      ponerEnDisputa: new PonerEnDisputa(dependencias),
      quitarDeDisputa: new QuitarDeDisputa(dependencias),
    }),
  );
}
