import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { exigirPendiente, vencimientoAlCompletar } from '../../../dominio/ciclo-de-vida.js';
import type { DocumentoPorPagarDto } from '../../dto/documento-por-pagar.dto.js';
import { bloquear, dtosDe, etiquetaDe, filaDe, type DependenciasDeAcciones } from './dependencias-de-acciones.js';

/** Un documento por completar con el vencimiento que el usuario confirmó; sin él se queda el propuesto al recibirlo. */
export interface DocumentoPorCompletar {
  id: string;
  vencimiento?: string;
}

/**
 * Completa en lote lo que está pendiente en la bandeja (hasta 100, todo o nada): lo pasa a `registrado`, con quién y
 * cuándo, y deja a cada cargo con su vencimiento definitivo. No avisa a Libro de compras ni audita: no es dinero ni una
 * baja. Los documentos se bloquean en orden de id, así dos lotes que se cruzan no se traban entre sí.
 */
export class CompletarDocumentos {
  constructor(private readonly dependencias: DependenciasDeAcciones) {}

  /**
   * @throws RecursoNoEncontrado si algún documento no existe.
   * @throws DocumentoNoPendiente si alguno ya no está en la bandeja.
   * @throws VencimientoInvalido si una nota de crédito trae vencimiento o un cargo vence antes de emitirse.
   */
  ejecutar(operador: Operador, pedido: readonly DocumentoPorCompletar[]): Promise<DocumentoPorPagarDto[]> {
    const ordenado = [...pedido].sort((a, b) => a.id.localeCompare(b.id));
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      for (const documento of ordenado) await this.completar(operador, documento);
      return dtosDe(
        this.dependencias,
        operador,
        pedido.map(({ id }) => id),
      );
    });
  }

  private async completar(operador: Operador, { id, vencimiento }: DocumentoPorCompletar): Promise<void> {
    const { documentos, consultas } = this.dependencias;
    const etiqueta = etiquetaDe((await filaDe(consultas, id)).origen);
    const { documento } = await bloquear(documentos, id);
    exigirPendiente(documento, etiqueta);
    await documentos.registrar(id, {
      registradoPor: operador.usuarioId,
      vencimiento: vencimientoAlCompletar(documento, vencimiento),
    });
  }
}
