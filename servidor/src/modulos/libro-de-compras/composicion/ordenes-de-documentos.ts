import '../../core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { AnularDocumento } from '../aplicacion/casos-uso/documentos/anular-documento.js';
import type { EliminarDocumento } from '../aplicacion/casos-uso/documentos/eliminar-documento.js';
import type { MarcarDocumentoProcesado } from '../aplicacion/casos-uso/documentos/marcar-documento-procesado.js';

interface CasosDeUsoDeLasOrdenes {
  marcarProcesado: MarcarDocumentoProcesado;
  anular: AnularDocumento;
  eliminar: EliminarDocumento;
}

/**
 * Atiende las órdenes que mandan los destinos (`marcar_procesado`, `anular_documento`, `eliminar_documento`) con los
 * mismos casos de uso que las rutas. El permiso lo exige la ruta del destino que origina; las dos bajas corren en la
 * transacción del destino y, si traen su `origen`, no le devuelven el aviso.
 */
export function atenderOrdenesDeDocumentos({ marcarProcesado, anular, eliminar }: CasosDeUsoDeLasOrdenes): void {
  const modulo = 'libro-de-compras';
  mediador.atender(modulo, 'libro-de-compras.marcar_procesado', (datos, operador) =>
    marcarProcesado.ejecutar(operador, datos),
  );
  mediador.atender(modulo, 'libro-de-compras.anular_documento', async (datos, operador) => {
    await anular.ejecutar(operador, datos);
  });
  mediador.atender(modulo, 'libro-de-compras.eliminar_documento', (datos, operador) =>
    eliminar.ejecutar(operador, datos),
  );
}
