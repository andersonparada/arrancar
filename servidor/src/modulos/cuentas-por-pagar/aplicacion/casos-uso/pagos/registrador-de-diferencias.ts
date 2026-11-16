import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { EFECTO_DE_LA_DIFERENCIA_DE_UN_CARGO } from '../../../dominio/ajustes.js';
import type { DocumentoConAplicaciones } from '../../../dominio/documento-por-pagar.js';
import { AjusteRegistrado } from '../../../dominio/eventos-de-ajustes.js';
import { dtoDeFicha } from '../../dto/ficha-del-documento.dto.js';
import { RECURSO_DE_AJUSTES, type DependenciasDeRegistrarPago } from './dependencias-de-pagos.js';

type Dependencias = Pick<DependenciasDeRegistrarPago, 'ajustes' | 'auditoria'>;

/** La diferencia de centavos que se da por saldada de un cargo de un pago. */
export interface DiferenciaPorRegistrar {
  pagoId: string;
  /** El número del pago como se lee, para el motivo fijo. */
  numeroDelPago: string;
  /** `AAAA-MM-DD`. */
  fecha: string;
  /** El cargo bloqueado, como estaba antes del ajuste. */
  cargo: DocumentoConAplicaciones;
  montoCentavos: number;
}

/**
 * Guarda la diferencia de centavos de un cargo como un ajuste ligado a su pago (causa `diferencia_menor`, motivo fijo), la
 * audita como `ajustar` con el cargo como estaba y arma el evento `ajuste_registrado` con efecto `ingreso`. La usan el pago
 * (al pagar) y la ficha del pago (después).
 */
export class RegistradorDeDiferencias {
  constructor(private readonly dependencias: Dependencias) {}

  async registrar(operador: Operador, por: DiferenciaPorRegistrar): Promise<AjusteRegistrado> {
    const { documento } = por.cargo;
    const ajusteId = await this.guardar(por);
    return new AjusteRegistrado({
      documentoId: documento.id,
      proveedorId: documento.proveedorId,
      serie: documento.serie,
      numero: documento.numero,
      empresaId: operador.empresaId,
      ajusteId,
      montoCentavos: por.montoCentavos,
      fecha: por.fecha,
      causa: 'diferencia_menor',
      efecto: EFECTO_DE_LA_DIFERENCIA_DE_UN_CARGO,
      referencia: null,
    });
  }

  /** Guarda el ajuste con su motivo fijo y lo audita como `ajustar` con el cargo como estaba. */
  private async guardar(por: DiferenciaPorRegistrar): Promise<string> {
    const motivo = `Diferencia al pagar con el pago ${por.numeroDelPago}`;
    const { ajustes, auditoria } = this.dependencias;
    const ajusteId = await ajustes.agregar(por.cargo.documento, {
      montoCentavos: por.montoCentavos,
      fecha: por.fecha,
      causa: 'diferencia_menor',
      motivo,
      referencia: null,
      pagoId: por.pagoId,
    });
    await auditoria.registrar({
      recurso: RECURSO_DE_AJUSTES,
      registroId: ajusteId,
      accion: 'ajustar',
      anterior: dtoDeFicha(por.cargo),
      motivo,
    });
    return ajusteId;
  }
}
