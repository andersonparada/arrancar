import type { Operador } from '../../../../../core/compartido/aplicacion/operador.js';
import { aDisputa, sinDisputa } from '../../../../dominio/documento-anulado.js';
import type { ComprobanteDto } from '../../../dto/comprobantes.dto.js';
import type { DependenciasDeComprobantes } from '../dependencias-de-comprobantes.js';
import { ApoyoDelDocumentoAnulado, type PeticionConMotivo } from './apoyo-del-documento-anulado.js';

export interface PeticionDeDisputa extends PeticionConMotivo {
  /** Dónde está la prueba de pago (cheque, voucher, estado de cuenta…). */
  prueba: string;
}

/**
 * La empresa no reconoce la anulación (`comprobantes.resolver`): el documento pasa de «por resolver» a «en disputa» con su
 * motivo y la prueba de pago, y se anota hasta cuándo se puede tomar el crédito (fecha del documento más dos meses). No
 * toca el efectivo ni vuelve a dar crédito: el «a favor» llega con una FEL nueva, que se registra como reemplazo. Audita
 * `corregir`.
 */
export class PonerEnDisputa {
  private readonly apoyo: ApoyoDelDocumentoAnulado;

  constructor(dependencias: DependenciasDeComprobantes) {
    this.apoyo = new ApoyoDelDocumentoAnulado(dependencias);
  }

  /** @throws RecursoNoEncontrado, ComprobanteSinDocumentoAnulado, SituacionDelDocumentoNoPermite */
  ejecutar(operador: Operador, pedido: PeticionDeDisputa): Promise<ComprobanteDto> {
    return this.apoyo.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const comprobante = await this.apoyo.bloquear(pedido.comprobanteId);
      const seguimiento = aDisputa(comprobante, pedido);
      const motivo = `En disputa, la empresa no reconoce la anulación (prueba: ${pedido.prueba}): ${pedido.motivo}`;
      return this.apoyo.guardar({ anterior: comprobante, seguimiento, accion: 'corregir', motivo });
    });
  }
}

/** Retira la disputa (no prosperó o se desistió): vuelve a «por resolver». Audita `corregir` con el motivo. */
export class QuitarDeDisputa {
  private readonly apoyo: ApoyoDelDocumentoAnulado;

  constructor(dependencias: DependenciasDeComprobantes) {
    this.apoyo = new ApoyoDelDocumentoAnulado(dependencias);
  }

  /** @throws RecursoNoEncontrado, ComprobanteSinDocumentoAnulado, SituacionDelDocumentoNoPermite */
  ejecutar(operador: Operador, pedido: PeticionConMotivo): Promise<ComprobanteDto> {
    return this.apoyo.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const comprobante = await this.apoyo.bloquear(pedido.comprobanteId);
      const seguimiento = sinDisputa(comprobante);
      const motivo = `La disputa se retiró: ${pedido.motivo}`;
      return this.apoyo.guardar({ anterior: comprobante, seguimiento, accion: 'corregir', motivo });
    });
  }
}
