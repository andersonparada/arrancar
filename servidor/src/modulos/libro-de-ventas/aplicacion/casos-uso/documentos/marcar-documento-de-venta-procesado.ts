import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { DestinoNoAdmitido, DocumentoYaAnulado } from '../../../dominio/errores-de-baja.js';
import type { RepositorioDeDocumentosDeVenta } from '../../puertos/puertos-de-documentos.js';

/**
 * La cartera marca el documento como procesado (ya tiene cobros o aplicaciones: solo se anula) o lo devuelve a
 * pendiente. Es la orden `libro-de-ventas.marcar_procesado`; corre en la transacción de quien la manda.
 */
export class MarcarDocumentoDeVentaProcesado {
  constructor(
    private readonly dependencias: { unidadDeTrabajo: UnidadDeTrabajo; repositorio: RepositorioDeDocumentosDeVenta },
  ) {}

  /** @throws RecursoNoEncontrado si no existe; DocumentoYaAnulado si ya está anulado; DestinoNoAdmitido si no va a ninguna cartera. */
  ejecutar(operador: Operador, peticion: { documentoId: string; procesado: boolean }): Promise<void> {
    const { unidadDeTrabajo, repositorio } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const guardado = await repositorio.buscar(peticion.documentoId, true);
      if (!guardado) throw new RecursoNoEncontrado('El documento');
      if (guardado.hechos.anulado) throw new DocumentoYaAnulado();
      if (peticion.procesado && !guardado.ficha.destino) {
        throw new DestinoNoAdmitido('El documento no va a ninguna cartera: no hay quién lo procese.');
      }
      await repositorio.marcarProcesado(peticion.documentoId, peticion.procesado);
    });
  }
}
