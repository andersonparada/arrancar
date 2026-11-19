import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { RECURSO_DE_COMPROBANTES, type Comprobante } from '../../../dominio/comprobantes.js';
import { ComprobanteRepuesto } from '../../../dominio/errores-de-comprobantes.js';
import { comprobanteDto } from './armado-del-comprobante.js';
import type { DependenciasDeComprobantes } from './dependencias-de-comprobantes.js';
import { eventoDeQuitado } from './utilidades-de-comprobantes.js';

type Dependencias = Pick<DependenciasDeComprobantes, 'comprobantes' | 'auditoria' | 'reloj'>;

/**
 * Anula un comprobante vigente que ya está bloqueado (un vale de gasto, o un documento cuando el libro lo anula): no puede
 * estar repuesto. Audita `anular` con el comprobante como estaba. Devuelve el evento `comprobante_quitado` si estaba en un
 * fondo (uno en la bandeja no movió ningún efectivo).
 */
export class AnuladorDeComprobantes {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws ComprobanteRepuesto */
  async anular(operador: Operador, por: { comprobante: Comprobante; motivo: string }): Promise<EventoDominio[]> {
    const { comprobante, motivo } = por;
    const { comprobantes, auditoria, reloj } = this.dependencias;
    if (comprobante.reposicionNumero !== null) throw new ComprobanteRepuesto(comprobante.reposicionNumero);
    const hoy = await reloj.hoy(operador);
    const fechaDeAnulacion = hoy < comprobante.fecha ? comprobante.fecha : hoy;
    await comprobantes.anular(comprobante.id, { anuladoPor: operador.usuarioId, motivo, fechaDeAnulacion });
    await auditoria.registrar({
      recurso: RECURSO_DE_COMPROBANTES,
      registroId: comprobante.id,
      accion: 'anular',
      anterior: comprobanteDto(comprobante),
      motivo,
    });
    return comprobante.fondoId === null ? [] : [eventoDeQuitado(operador, { comprobante, motivo: 'anulado' })];
  }
}
