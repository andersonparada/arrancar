import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { AVISO_DEL_CUSTODIO_QUE_LIQUIDA, avisoDeRetiroDeMesAnterior } from '../../../dominio/avisos-de-retiros.js';
import { liquidaElCustodio } from '../../../dominio/liquidacion-de-retiro.js';
import {
  disponibleDelRetiro,
  esDeMesAnterior,
  numeroDelRetiro,
  type RetiroDeEfectivo,
} from '../../../dominio/retiros.js';
import type { MovimientoDelRetiroDto, PagoDelRetiroDto, RetiroDto } from '../../dto/retiros.dto.js';
import type { PagoDelRetiro } from '../../puertos/puertos-de-retiros.js';

/** Todo lo que hace falta para armar el `RetiroDto`. */
export interface RetiroPorArmar {
  retiro: RetiroDeEfectivo;
  pagos: readonly PagoDelRetiro[];
  movimiento: MovimientoDelRetiroDto;
  deposito: MovimientoDelRetiroDto | null;
  /** El cheque o la nota del retiro ya está conciliado. */
  conciliado: boolean;
  hoy: string;
  /** El usuario que lee. */
  usuarioId: string;
  avisos: readonly string[];
}

const pagoDto = ({ montoCentavos, numero, anioDeNumero, ...pago }: PagoDelRetiro): PagoDelRetiroDto => ({
  ...pago,
  numero: numeroDelRetiro(numero, anioDeNumero),
  monto: deCentavos(montoCentavos),
});

const sumaDeVigentes = (pagos: readonly PagoDelRetiro[]): number =>
  pagos.filter(({ estado }) => estado === 'vigente').reduce((suma, { montoCentavos }) => suma + montoCentavos, 0);

/** Lo que cada estado deja hacer con el retiro. */
function accionesPosibles({ retiro, pagos, conciliado }: RetiroPorArmar) {
  const abierto = retiro.estado === 'abierto';
  return {
    puedeAnular: abierto && sumaDeVigentes(pagos) === 0 && !conciliado,
    puedeLiquidar: abierto,
    puedeReabrir: retiro.estado === 'liquidado',
  };
}

/** Los avisos que salen siempre con el retiro: el de fin de mes y el del custodio que lo liquidaría. */
function avisosDelRetiro(por: RetiroPorArmar, disponibleCentavos: number, deMesAnterior: boolean): string[] {
  const propios = deMesAnterior ? [avisoDeRetiroDeMesAnterior(por.retiro, disponibleCentavos)] : [];
  return [...por.avisos, ...propios];
}

/** Lo que el retiro guarda tal cual, sin cálculos. */
function datosGuardados(retiro: RetiroDeEfectivo) {
  return {
    id: retiro.id,
    numero: numeroDelRetiro(retiro.numero, retiro.anioDeNumero),
    forma: retiro.forma,
    fecha: retiro.fecha,
    monto: deCentavos(retiro.montoCentavos),
    custodio: retiro.custodio,
    custodioUsuarioId: retiro.custodioUsuarioId,
    observaciones: retiro.observaciones,
    estado: retiro.estado,
    devuelto: deCentavos(retiro.devueltoCentavos),
    faltante: deCentavos(retiro.faltanteCentavos),
    motivoDeFaltante: retiro.motivoDeFaltante,
  };
}

/** La liquidación y la anulación, solo en el estado que las tiene. */
function cierres({ retiro, deposito }: RetiroPorArmar): Pick<RetiroDto, 'liquidacion' | 'anulacion'> {
  return {
    liquidacion: retiro.fechaDeLiquidacion ? { fecha: retiro.fechaDeLiquidacion, deposito } : null,
    anulacion:
      retiro.estado === 'anulado' ? { fecha: retiro.fechaDeAnulacion!, motivo: retiro.motivoDeAnulacion! } : null,
  };
}

/** El retiro como lo ve la pantalla. El retiro anulado no deja efectivo por usar. */
export function dtoDelRetiro(por: RetiroPorArmar): RetiroDto {
  const { retiro, pagos, hoy } = por;
  const pagadoCentavos = sumaDeVigentes(pagos);
  const disponibleCentavos = retiro.estado === 'anulado' ? 0 : disponibleDelRetiro(retiro, pagadoCentavos);
  const deMesAnterior = retiro.estado === 'abierto' && esDeMesAnterior(retiro.fecha, hoy);
  return {
    ...datosGuardados(retiro),
    movimiento: por.movimiento,
    pagado: deCentavos(pagadoCentavos),
    disponible: deCentavos(disponibleCentavos),
    ...cierres(por),
    pagos: pagos.map(pagoDto),
    deMesAnterior,
    ...accionesPosibles(por),
    liquidaElCustodio: retiro.estado === 'abierto' && liquidaElCustodio(retiro.custodioUsuarioId, por.usuarioId),
    avisos: avisosDelRetiro(por, disponibleCentavos, deMesAnterior),
  };
}

/** Los avisos de la respuesta de liquidar: el del custodio, si quien liquida lo es. */
export const avisosDeLiquidar = (retiro: RetiroDeEfectivo, usuarioId: string): string[] =>
  liquidaElCustodio(retiro.custodioUsuarioId, usuarioId) ? [AVISO_DEL_CUSTODIO_QUE_LIQUIDA] : [];
