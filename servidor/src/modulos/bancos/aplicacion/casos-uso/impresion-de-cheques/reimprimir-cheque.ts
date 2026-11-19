import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ChequeSinImprimirNoSeReimprime, MotivoDeImpresionInvalido } from '../../../dominio/errores-de-impresion.js';
import type { ChequeParaImprimirDto } from '../../dto/impresion-de-cheque.dto.js';
import { ArmadorDeLaImpresion } from './armador-de-la-impresion.js';
import type { DependenciasDeImpresionDeCheques } from './dependencias-de-impresion-de-cheques.js';

const MAXIMO_DEL_MOTIVO = 300;

export interface ReimpresionDeCheque {
  chequeId: string;
  motivo: string;
  /** `false` = solo el comprobante (otra copia, o el formulario sigue en blanco y solo falta el voucher). */
  conCheque: boolean;
}

/**
 * Reimprime un cheque ya impreso (`cheques.reimprimir`): el motivo es obligatorio, la impresión queda como `reimpresion`,
 * el comprobante dice «REIMPRESIÓN» y la auditoría guarda el cheque con sus impresiones anteriores.
 */
export class ReimprimirCheque {
  private readonly armador: ArmadorDeLaImpresion;

  constructor(private readonly dependencias: DependenciasDeImpresionDeCheques) {
    this.armador = new ArmadorDeLaImpresion(dependencias);
  }

  /**
   * @throws MotivoDeImpresionInvalido si falta el motivo o pasa de 300 caracteres.
   * @throws ChequeSinImprimirNoSeReimprime si todavía no se imprimió; ChequeNoImprimible si está anulado o es de la apertura.
   */
  ejecutar(operador: Operador, solicitud: ReimpresionDeCheque): Promise<ChequeParaImprimirDto> {
    const { unidadDeTrabajo } = this.dependencias;
    const motivo = solicitud.motivo.trim();
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (!motivo || motivo.length > MAXIMO_DEL_MOTIVO) throw new MotivoDeImpresionInvalido();
      const [cheque] = await this.armador.cargar([solicitud.chequeId]);
      this.armador.exigirImprimible(cheque!);
      if (!cheque!.impresoEn) throw new ChequeSinImprimirNoSeReimprime(cheque!.numero);
      const [armado] = await this.armador.armar(operador, [cheque!], {
        esReimpresion: true,
        conCheque: solicitud.conCheque,
        impreso: true,
      });
      await this.registrar(operador, {
        solicitud,
        motivo,
        formato: armado!.formato,
        movimientoId: cheque!.movimiento!.id,
      });
      return armado!.dto;
    });
  }

  private async registrar(
    operador: Operador,
    { solicitud, motivo, formato, movimientoId }: DatosDelRegistro,
  ): Promise<void> {
    const { consultasDeCheques, consultas, impresiones, auditoria } = this.dependencias;
    const cheque = await consultasDeCheques.obtener(solicitud.chequeId);
    const anterior = { ...cheque, impresiones: await consultas.historial(solicitud.chequeId) };
    await impresiones.agregar({
      empresaId: operador.empresaId,
      chequeId: solicitud.chequeId,
      movimientoId,
      tipo: 'reimpresion',
      conCheque: solicitud.conCheque,
      motivo,
      loteId: null,
      formato,
    });
    await auditoria.registrar({
      recurso: 'bancos.cheques',
      registroId: solicitud.chequeId,
      accion: 'reimprimir',
      anterior,
      motivo,
    });
  }
}

interface DatosDelRegistro {
  solicitud: ReimpresionDeCheque;
  motivo: string;
  formato: Parameters<DependenciasDeImpresionDeCheques['impresiones']['agregar']>[0]['formato'];
  movimientoId: string;
}
