import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { exigirVencimientoNuevoValido } from '../../../dominio/ciclo-de-vida.js';
import type { DocumentoPorPagarDto } from '../../dto/documento-por-pagar.dto.js';
import { bloquear, dtosDe, etiquetaDe, filaDe, type DependenciasDeAcciones } from './dependencias-de-acciones.js';

/**
 * Cambia el vencimiento de un cargo completado o autorizado (por ejemplo, el que se pactó distinto con el proveedor).
 * No se audita: no es dinero ni una baja; la fila guarda quién lo cambió por última vez.
 */
export class CambiarVencimiento {
  constructor(private readonly dependencias: DependenciasDeAcciones) {}

  /**
   * @throws RecursoNoEncontrado si el documento no existe.
   * @throws VencimientoNoEditable si es una nota de crédito o no está completado ni autorizado.
   * @throws VencimientoInvalido si vence antes de emitirse.
   */
  ejecutar(operador: Operador, pedido: { id: string; vencimiento: string }): Promise<DocumentoPorPagarDto> {
    const { unidadDeTrabajo, documentos, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const etiqueta = etiquetaDe((await filaDe(consultas, pedido.id)).origen);
      const { documento } = await bloquear(documentos, pedido.id);
      exigirVencimientoNuevoValido(documento, pedido.vencimiento, etiqueta);
      await documentos.cambiarVencimiento(pedido.id, pedido.vencimiento);
      return (await dtosDe(this.dependencias, operador, [pedido.id]))[0]!;
    });
  }
}
