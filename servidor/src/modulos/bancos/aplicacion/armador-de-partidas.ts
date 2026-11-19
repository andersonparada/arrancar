import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { revisarLaPartida, saldoDelBancoComoMovimiento } from '../dominio/apertura.js';
import { esParteDeCheque, esSaldoInicialLaParte, type ParteQueSeAgrega } from '../dominio/partes-de-apertura.js';
import type { DatosDeMovimiento } from '../dominio/propiedades-de-movimiento.js';
import type { ConceptosDeMovimientos } from './conceptos-de-movimientos.js';
import type { SolicitudDePartida } from './dto/saldo-inicial.dto.js';
import type { ModulosDeOrigen } from './puertos/modulos-de-origen.js';

interface Dependencias {
  conceptos: ConceptosDeMovimientos;
  modulosDeOrigen: ModulosDeOrigen;
}

/** Lo que se escribe de una partida, ya limpio: lo que no aplica a su parte queda nulo. */
export interface PartidaNormalizada extends Omit<SolicitudDePartida, 'serie' | 'beneficiario'> {
  serie: string | null;
  beneficiario: string | null;
}

const limpio = (texto: string | null): string | null => texto?.trim() || null;

/** Deja solo lo que aplica a la parte: el sentido en el error del banco, el concepto en el posfechado, serie y número en cheques. */
export function normalizarLaPartida(solicitud: SolicitudDePartida): PartidaNormalizada {
  const { parte } = solicitud;
  const esCheque = esParteDeCheque(parte);
  return {
    ...solicitud,
    sentido: parte === 'error_del_banco' ? solicitud.sentido : null,
    conceptoId: parte === 'cheque_posfechado' ? solicitud.conceptoId : null,
    serie: esCheque ? limpio(solicitud.serie) : null,
    numeroDeCheque: esCheque ? solicitud.numeroDeCheque : null,
    beneficiario: limpio(solicitud.beneficiario),
    referencia: limpio(solicitud.referencia),
    observaciones: limpio(solicitud.observaciones),
  };
}

const tipoDeLaParte = (parte: ParteQueSeAgrega, sentido: 'credito' | 'debito' | null): DatosDeMovimiento['tipo'] => {
  if (parte === 'cheque_en_circulacion' || parte === 'cheque_posfechado') return 'cheque';
  if (parte === 'deposito_en_transito') return 'credito';
  if (parte === 'debito_en_transito') return 'debito';
  return sentido ?? 'credito';
};

/**
 * Arma los datos del movimiento de una partida: revisa lo propio de su clase y elige su concepto (el de sistema
 * «saldo inicial» para toda partida de apertura; el que eligió el usuario para el posfechado, que cuenta en su fecha).
 */
export class ArmadorDePartidas {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws PartidaDespuesDelCorte, PosfechadoNoPosterior, NumeroDeChequeObligatorio, BeneficiarioObligatorio,
   *   SentidoDelErrorObligatorio, DescripcionDelErrorObligatoria o los errores de concepto del posfechado.
   */
  async datos(
    operador: Operador,
    partida: PartidaNormalizada,
    { corte, conceptoActual }: { corte: string; conceptoActual?: string },
  ): Promise<DatosDeMovimiento> {
    revisarLaPartida(partida, corte);
    const conceptoId = await this.conceptoDe(operador, partida, conceptoActual);
    const serie = partida.serie ?? '';
    return {
      cuentaBancariaId: partida.cuentaBancariaId,
      tipo: tipoDeLaParte(partida.parte, partida.sentido),
      fecha: partida.fecha,
      monto: partida.monto,
      saldoInicial: esSaldoInicialLaParte(partida.parte),
      referencia: partida.referencia ?? (partida.numeroDeCheque ? `Cheque ${serie}${partida.numeroDeCheque}` : null),
      beneficiario: partida.beneficiario,
      observaciones: partida.observaciones,
      conceptoId,
    };
  }

  /** El saldo según el estado de cuenta al corte: crédito (o débito si es negativo) con el concepto «saldo inicial». */
  async datosDelSaldoDelBanco(
    operador: Operador,
    { cuentaBancariaId, corte, saldo }: { cuentaBancariaId: string; corte: string; saldo: string },
  ): Promise<DatosDeMovimiento> {
    const concepto = await this.dependencias.conceptos.deSistema(operador, 'saldo_inicial');
    return {
      cuentaBancariaId,
      ...saldoDelBancoComoMovimiento(saldo),
      fecha: corte,
      saldoInicial: true,
      referencia: null,
      beneficiario: null,
      observaciones: null,
      conceptoId: concepto.id.valor,
    };
  }

  private async conceptoDe(operador: Operador, partida: PartidaNormalizada, actual?: string): Promise<string> {
    const { conceptos, modulosDeOrigen } = this.dependencias;
    if (partida.parte !== 'cheque_posfechado') return (await conceptos.deSistema(operador, 'saldo_inicial')).id.valor;
    const modulosActivos = await modulosDeOrigen.activos(operador);
    const concepto = await conceptos.elegido(partida.conceptoId ?? undefined, 'cheque', { actual, modulosActivos });
    return concepto.id.valor;
  }
}
