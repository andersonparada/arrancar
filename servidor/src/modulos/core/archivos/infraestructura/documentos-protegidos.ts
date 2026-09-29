import { configuracion } from '../../../../configuracion.js';
import type { DocumentosProtegidos } from '../../compartido/aplicacion/documentos-protegidos.js';
import { almacenamiento } from '../../compartido/infraestructura/almacenamiento-local.js';
import { GestorDeDocumentos } from '../aplicacion/gestor-de-documentos.js';
import { OptimizadorSharp } from './optimizador-sharp.js';
import { RepositorioArchivosDrizzle } from './persistencia/repositorio-archivos.drizzle.js';
import { EjecutorDeQpdf } from './qpdf/ejecutor-de-qpdf.js';
import { InspectorQpdf } from './qpdf/inspector-qpdf.js';

/** Un solo optimizador para fotos y documentos: comparten el tope de trabajos a la vez. */
export const optimizadorDeImagenes = new OptimizadorSharp();

/** Los documentos protegidos con las piezas reales: disco, sharp y qpdf. */
export function crearDocumentosProtegidos(): DocumentosProtegidos {
  return new GestorDeDocumentos({
    repositorio: new RepositorioArchivosDrizzle(),
    almacenamiento,
    optimizador: optimizadorDeImagenes,
    inspector: new InspectorQpdf(new EjecutorDeQpdf(configuracion.RUTA_QPDF)),
  });
}
