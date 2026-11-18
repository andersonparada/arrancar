import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { exigirCargoConSaldo, exigirVencimientoNuevoValido } from '../../../dominio/ciclo-de-vida.js';
import { saldoDe } from '../../../dominio/saldos.js';
import type { DocumentoPorPagarDto } from '../../dto/documento-por-pagar.dto.js';
import { aplicadoDe } from '../../dto/dto-de-documento-por-pagar.js';
import { dtoDeFicha } from '../../dto/ficha-del-documento.dto.js';
import { bloquear, dtosDe, etiquetaDe, filaDe, type DependenciasDeAcciones } from './dependencias-de-acciones.js';

/** Lo que necesita cambiar el vencimiento: lo de las acciones y la auditoría. */
export interface DependenciasDeCambioDeVencimiento extends DependenciasDeAcciones {
  auditoria: Auditoria;
}

/**
 * Cambia el vencimiento de un cargo completado o autorizado que todavía tiene saldo (por ejemplo, el que se pactó
 * distinto con el proveedor). Un cargo ya pagado o compensado del todo no se toca. Audita `cambiar_vencimiento` con el
 * documento como estaba y el vencimiento nuevo, en la misma transacción.
 */
export class CambiarVencimiento {
  constructor(private readonly dependencias: DependenciasDeCambioDeVencimiento) {}

  /**
   * @throws RecursoNoEncontrado si el documento no existe.
   * @throws VencimientoNoEditable si es una nota de crédito o no está completado ni autorizado.
   * @throws VencimientoInvalido si vence antes de emitirse.
   * @throws VencimientoDeCargoSaldado si el cargo ya no tiene saldo.
   */
  ejecutar(operador: Operador, pedido: { id: string; vencimiento: string }): Promise<DocumentoPorPagarDto> {
    const { unidadDeTrabajo, documentos, consultas, auditoria, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const etiqueta = etiquetaDe((await filaDe(consultas, pedido.id)).documento);
      const guardado = await bloquear(documentos, pedido.id);
      exigirVencimientoNuevoValido(guardado.documento, pedido.vencimiento, etiqueta);
      const fila = await filaDe(consultas, pedido.id);
      const hoy = await reloj.hoy(operador);
      exigirCargoConSaldo(saldoDe(fila.documento, aplicadoDe(fila, hoy)).deudaCentavos, etiqueta);
      await auditoria.registrar({
        recurso: 'cuentas-por-pagar.documentos',
        registroId: pedido.id,
        accion: 'cambiar_vencimiento',
        anterior: { ...dtoDeFicha(guardado), vencimientoNuevo: pedido.vencimiento },
      });
      await documentos.cambiarVencimiento(pedido.id, pedido.vencimiento);
      return (await dtosDe(this.dependencias, operador, [pedido.id]))[0]!;
    });
  }
}
