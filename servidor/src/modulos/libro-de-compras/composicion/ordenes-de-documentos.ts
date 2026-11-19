import '../../core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { AnularDocumento } from '../aplicacion/casos-uso/documentos/anular-documento.js';
import type { CambiarMarcaDeInventario } from '../aplicacion/casos-uso/documentos/cambiar-marca-de-inventario.js';
import type { EliminarDocumento } from '../aplicacion/casos-uso/documentos/eliminar-documento.js';
import type { MarcarDocumentoProcesado } from '../aplicacion/casos-uso/documentos/marcar-documento-procesado.js';

interface CasosDeUsoDeLasOrdenes {
  marcarProcesado: MarcarDocumentoProcesado;
  anular: AnularDocumento;
  eliminar: EliminarDocumento;
  cambiarMarca: CambiarMarcaDeInventario;
}

/**
 * Atiende las órdenes que mandan los destinos (`marcar_procesado`, `anular_documento`, `eliminar_documento` y `cambiar_marca_de_inventario`) con los
 * mismos casos de uso que las rutas. El permiso lo exige la ruta del destino que origina; las dos bajas corren en la
 * transacción del destino y, si traen su `origen`, no le devuelven el aviso.
 */
export function atenderOrdenesDeDocumentos(casos: CasosDeUsoDeLasOrdenes): void {
  const { marcarProcesado, anular, eliminar, cambiarMarca } = casos;
  const modulo = 'libro-de-compras';
  mediador.atender(modulo, 'libro-de-compras.marcar_procesado', (datos, operador) =>
    marcarProcesado.ejecutar(operador, datos),
  );
  mediador.atender(modulo, 'libro-de-compras.anular_documento', async (datos, operador) => {
    const { avisos } = await anular.ejecutar(operador, datos);
    return { avisos };
  });
  mediador.atender(modulo, 'libro-de-compras.eliminar_documento', async (datos, operador) => {
    await eliminar.ejecutar(operador, datos);
  });
  mediador.atender(modulo, 'libro-de-compras.cambiar_marca_de_inventario', async (datos, operador) => {
    await cambiarMarca.ejecutar(operador, datos);
  });
}
