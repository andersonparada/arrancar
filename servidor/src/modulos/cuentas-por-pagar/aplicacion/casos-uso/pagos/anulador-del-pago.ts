import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { EFECTO_DE_LA_CAUSA, type AjusteDeSaldo } from '../../../dominio/ajustes.js';
import { fechaDeAnulacionDelPago, efectoDelPago, type AnulacionEnBancos } from '../../../dominio/anulacion-de-pagos.js';
import { AjusteAnulado } from '../../../dominio/eventos-de-ajustes.js';
import { PagoAnulado } from '../../../dominio/eventos-de-pagos.js';
import { creoSuMovimiento, type PagoConLineas } from '../../../dominio/pago-con-lineas.js';
import { revisarReglasDePago, type ReglaDePago } from '../../../dominio/reglas-de-anulacion-de-pagos.js';
import { ajusteDto } from '../../dto/ficha-del-documento.dto.js';
import { bloquear } from '../acciones/dependencias-de-acciones.js';
import { RECURSO_DE_AJUSTES, type DependenciasDeCambiarPagos } from './dependencias-de-pagos.js';
import { LectorDelPago } from './lector-del-pago.js';

/** El recurso con que se audita anular, reaplicar y corregir un pago. */
export const RECURSO_DE_PAGOS = 'cuentas-por-pagar.pagos';

/** Lo que hizo Bancos con el movimiento del pago, para fechar la anulación. */
export interface AnulacionHechaEnBancos {
  enBancos: AnulacionEnBancos;
  /** La fecha del inverso; solo con `con_inverso`. */
  fechaDelInverso: string | null;
}

/** Por qué y cómo se anula el pago. */
export interface DatosDeAnular extends AnulacionHechaEnBancos {
  motivo: string;
}

type Dependencias = Pick<
  DependenciasDeCambiarPagos,
  | 'pagos'
  | 'ajustes'
  | 'documentos'
  | 'auditoria'
  | 'reloj'
  | 'consultas'
  | 'consultasDePagos'
  | 'movimientos'
  | 'retiros'
>;

/**
 * Los pasos 4 a 6 de anular un pago (diseño de CP4 §5.9), vengan de la ventana de aquí o del aviso de Bancos: anula los
 * ajustes de diferencia del pago, lo deja `anulado` con su fecha contable (sus líneas, sin vigencia: la retención descontada
 * queda libre para el siguiente pago), lo audita como estaba y arma los eventos que quien llama publica al confirmar.
 */
export class AnuladorDelPago {
  private readonly lector: LectorDelPago;

  constructor(private readonly dependencias: Dependencias) {
    this.lector = new LectorDelPago(dependencias);
  }

  /** Corre las reglas de anular o reaplicar con lo que Bancos dice del cheque o la nota que el pago creó. */
  async revisar(pago: PagoConLineas, reglas: readonly ReglaDePago[]): Promise<void> {
    const conciliado =
      creoSuMovimiento(pago) &&
      pago.movimientoId !== null &&
      (await this.dependencias.movimientos.estaConciliado(pago.movimientoId));
    const retiro = pago.retiroId === null ? null : await this.dependencias.retiros.buscar(pago.retiroId);
    await revisarReglasDePago(reglas, { pago, conciliado, retiro });
  }

  async anular(operador: Operador, pago: PagoConLineas, datos: DatosDeAnular): Promise<EventoDominio[]> {
    const { pagos, auditoria, reloj } = this.dependencias;
    const anterior = (await this.lector.leer(operador, pago)).dto;
    const fecha = fechaDeAnulacionDelPago(pago, { ...datos, hoy: await reloj.hoy(operador) });
    const ajustes = await this.anularDiferencias(operador, pago, { motivo: datos.motivo, fecha });
    await pagos.anular(pago.id, { anuladoPor: operador.usuarioId, motivo: datos.motivo, fechaDeAnulacion: fecha });
    await auditoria.registrar({
      recurso: RECURSO_DE_PAGOS,
      registroId: pago.id,
      accion: 'anular',
      anterior,
      motivo: datos.motivo,
    });
    return [this.evento(operador, pago, { enBancos: datos.enBancos, fecha }), ...ajustes];
  }

  /**
   * Anula los ajustes vigentes de diferencia del pago (cada uno auditado como `anular`): el saldo del cargo vuelve a lo que
   * quedó sin pagar. Bloquea cada cargo antes, en orden de id. La reaplicación también lo usa.
   */
  async anularDiferencias(
    operador: Operador,
    pago: Pick<PagoConLineas, 'id'>,
    { motivo, fecha }: { motivo: string; fecha: string },
  ): Promise<EventoDominio[]> {
    const { ajustes, auditoria, documentos } = this.dependencias;
    const eventos: EventoDominio[] = [];
    for (const ajuste of await ajustes.vigentesDelPago(pago.id)) {
      await bloquear(documentos, ajuste.documentoId);
      await auditoria.registrar({
        recurso: RECURSO_DE_AJUSTES,
        registroId: ajuste.id,
        accion: 'anular',
        anterior: ajusteDto(ajuste),
        motivo,
      });
      await ajustes.anular(ajuste.id, { anuladoPor: operador.usuarioId, motivo });
      eventos.push(this.ajusteAnulado(operador, ajuste, fecha));
    }
    return eventos;
  }

  private ajusteAnulado(operador: Operador, ajuste: AjusteDeSaldo, fecha: string): AjusteAnulado {
    return new AjusteAnulado({
      empresaId: operador.empresaId,
      ajusteId: ajuste.id,
      documentoId: ajuste.documentoId,
      fecha,
      montoCentavos: ajuste.montoCentavos,
      efecto: EFECTO_DE_LA_CAUSA[ajuste.causa],
    });
  }

  private evento(
    operador: Operador,
    pago: PagoConLineas,
    { enBancos, fecha }: { enBancos: AnulacionEnBancos; fecha: string },
  ): PagoAnulado {
    return new PagoAnulado({
      empresaId: operador.empresaId,
      pagoId: pago.id,
      fecha,
      fechaOriginal: pago.fecha,
      anulacionEnBancos: enBancos,
      montoCentavos: pago.montoCentavos,
      efecto: efectoDelPago(pago),
      movimientoId: pago.movimientoId,
      retiroId: pago.retiroId,
    });
  }
}
