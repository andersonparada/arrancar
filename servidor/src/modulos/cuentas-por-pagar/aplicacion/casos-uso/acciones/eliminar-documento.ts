import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { exigirEliminable } from '../../../dominio/ciclo-de-vida.js';
import { REGLAS_PARA_ELIMINAR, type ReglaDeBaja } from '../../../dominio/reglas-de-baja.js';
import { dtoDeFicha } from '../../dto/ficha-del-documento.dto.js';
import { deshacerAplicaciones, revisarReglasDeBaja } from '../bajas/preparar-la-baja.js';
import { bloquear, etiquetaDe, filaDe, type DependenciasDeBajas } from './dependencias-de-acciones.js';

/**
 * Elimina un documento pendiente o completado, sin notas, desde Cuentas por pagar; también lo elimina de Libro de compras.
 * Al revés que al anular, aquí se borra primero la fila de aquí (la llave obliga) y después se manda la orden a Libro de
 * compras, que revisa sus reglas; si las rechaza, se deshace todo. Para mantener el orden de bloqueo («Libro de compras,
 * luego Cuentas por pagar») lee primero la fila de Libro de compras con `for update`. Audita `eliminar` con la ficha tal
 * como estaba. No publica evento: Libro de compras ya publica `documento_eliminado`.
 */
export class EliminarDocumento {
  constructor(
    private readonly dependencias: DependenciasDeBajas,
    private readonly reglas: readonly ReglaDeBaja[] = REGLAS_PARA_ELIMINAR,
  ) {}

  /**
   * @throws RecursoNoEncontrado si no existe.
   * @throws DocumentoNoEliminable, DocumentoConNotas, DocumentoAutorizado o el error de una regla de baja si no se puede.
   * @throws el error de Libro de compras si rechaza la eliminación.
   */
  ejecutar(operador: Operador, id: string): Promise<void> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, () => this.eliminar(operador, id));
  }

  private async eliminar(operador: Operador, id: string): Promise<void> {
    const { documentos, consultas, aplicaciones, auditoria, documentosDeCompra, libroDeCompras } = this.dependencias;
    const { documento, origen, notasEnTotal } = await filaDe(consultas, id);
    const etiqueta = etiquetaDe(origen);
    exigirEliminable(documento, notasEnTotal, etiqueta);
    await documentosDeCompra.bloquear(documento.documentoId);
    const guardado = await bloquear(documentos, id);
    exigirEliminable(guardado.documento, notasEnTotal, etiqueta);
    await revisarReglasDeBaja(this.reglas, guardado);
    await auditoria.registrar({
      recurso: 'cuentas-por-pagar.documentos',
      registroId: id,
      accion: 'eliminar',
      anterior: dtoDeFicha(guardado),
    });
    await deshacerAplicaciones(aplicaciones, guardado.documento);
    await documentos.eliminar(id);
    await libroDeCompras.eliminar(operador, documento.documentoId);
  }
}
