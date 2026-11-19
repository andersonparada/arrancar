import type { Anticipo, DestinoDeLoNoLiquidado } from './anticipos.js';
import {
  CuotasInsuficientes,
  DestinoDeNoLiquidadoObligatorio,
  FechaDeLiquidacionInvalida,
  LiquidacionNoCuadra,
  MotivoDeNoLiquidadoObligatorio,
  RentaDelTrabajoSoloEmpleados,
} from './errores-de-liquidacion.js';

const MAXIMO_DEL_MOTIVO = 300;
/** Las cuotas mínimas para cobrar lo no liquidado, salvo pago voluntario (L9, CL-s). */
export const CUOTAS_MINIMAS = 5;

/** Lo que dice quien liquida, en centavos. */
export interface LiquidacionPedida {
  devueltoCentavos: number;
  noLiquidadoCentavos: number;
  destino: DestinoDeLoNoLiquidado | null;
  cuotas: number | null;
  /** El beneficiario acepta pagar en menos cuotas: deja bajar el mínimo hasta 1. */
  pagoVoluntario: boolean;
  motivoDeNoLiquidado: string | null;
}

/** La liquidación ya revisada: lo que se guarda. */
export interface LiquidacionRevisada {
  devueltoCentavos: number;
  /** Lo que se gastó de más y la empresa reembolsa. */
  reembolsadoCentavos: number;
  noLiquidadoCentavos: number;
  destino: DestinoDeLoNoLiquidado | null;
  cuotas: number | null;
  motivoDeNoLiquidado: string | null;
}

type DatosDeLoNoLiquidado = Pick<LiquidacionRevisada, 'destino' | 'cuotas' | 'motivoDeNoLiquidado'>;

/** Sin gastos de más, devuelto + no liquidado es lo que falta; con gastos de más, no hay nada de ambos. */
function reembolsoQueCuadra(porJustificarCentavos: number, pedida: LiquidacionPedida): number {
  const repartido = pedida.devueltoCentavos + pedida.noLiquidadoCentavos;
  if (porJustificarCentavos < 0) {
    if (repartido !== 0) throw new LiquidacionNoCuadra(porJustificarCentavos);
    return -porJustificarCentavos;
  }
  if (repartido !== porJustificarCentavos) throw new LiquidacionNoCuadra(porJustificarCentavos);
  return 0;
}

function cuotasDelCobro(pedida: LiquidacionPedida): number {
  const minimo = pedida.pagoVoluntario ? 1 : CUOTAS_MINIMAS;
  if (pedida.cuotas === null || pedida.cuotas < minimo) throw new CuotasInsuficientes(minimo);
  return pedida.cuotas;
}

function motivoDeLoNoLiquidado(pedida: LiquidacionPedida): string {
  const motivo = pedida.motivoDeNoLiquidado?.trim() ?? '';
  if (motivo === '' || motivo.length > MAXIMO_DEL_MOTIVO) throw new MotivoDeNoLiquidadoObligatorio();
  return motivo;
}

/**
 * Lo no liquidado dice a dónde va (cobrar en cuotas, renta del trabajo solo de un empleado, o pérdida) y por qué; sin nada
 * no liquidado no queda destino, cuotas ni motivo.
 * @throws DestinoDeNoLiquidadoObligatorio, RentaDelTrabajoSoloEmpleados, CuotasInsuficientes, MotivoDeNoLiquidadoObligatorio
 */
function datosDeLoNoLiquidado(pedida: LiquidacionPedida, esEmpleado: boolean): DatosDeLoNoLiquidado {
  if (pedida.noLiquidadoCentavos === 0) return { destino: null, cuotas: null, motivoDeNoLiquidado: null };
  if (pedida.destino === null) throw new DestinoDeNoLiquidadoObligatorio();
  if (pedida.destino === 'renta_del_trabajo' && !esEmpleado) throw new RentaDelTrabajoSoloEmpleados();
  const cuotas = pedida.destino === 'cobrar' ? cuotasDelCobro(pedida) : null;
  return { destino: pedida.destino, cuotas, motivoDeNoLiquidado: motivoDeLoNoLiquidado(pedida) };
}

/**
 * Revisa lo que pide quien liquida contra lo que falta por justificar (el monto menos lo gastado, negativo si se gastó de
 * más) y arma la liquidación que se guarda.
 * @throws LiquidacionNoCuadra y los de lo no liquidado.
 */
export function revisarLaLiquidacion(
  anticipo: Pick<Anticipo, 'esEmpleado'>,
  { porJustificarCentavos, pedida }: { porJustificarCentavos: number; pedida: LiquidacionPedida },
): LiquidacionRevisada {
  const reembolsadoCentavos = reembolsoQueCuadra(porJustificarCentavos, pedida);
  return {
    devueltoCentavos: pedida.devueltoCentavos,
    reembolsadoCentavos,
    noLiquidadoCentavos: pedida.noLiquidadoCentavos,
    ...datosDeLoNoLiquidado(pedida, anticipo.esEmpleado),
  };
}

/**
 * La liquidación no es futura ni anterior a la entrega ni al último gasto.
 * @throws FechaDeLiquidacionInvalida
 */
export function exigirFechaDeLiquidacion(fecha: string, limites: { minima: string; hoy: string }): void {
  if (fecha > limites.hoy || fecha < limites.minima) throw new FechaDeLiquidacionInvalida(limites.minima);
}

/** Cómo anuló Bancos el depósito o el reembolso al reabrir (nada si no hubo ninguno). */
export interface DatosDeLaFechaDeReabrir {
  enBancos: 'sin_inverso' | 'con_inverso' | null;
  fechaDelInverso: string | null;
  hoy: string;
}

/**
 * La fecha contable de reabrir: sin movimiento en Bancos o sin la fecha del inverso, hoy (nunca antes de la liquidación);
 * «sin inverso» el depósito o el reembolso nunca existió y vale la fecha de la liquidación; con inverso, la del inverso.
 */
export function fechaDeReabrirElAnticipo(fechaDeLiquidacion: string, datos: DatosDeLaFechaDeReabrir): string {
  if (datos.enBancos === 'sin_inverso') return fechaDeLiquidacion;
  if (datos.enBancos === 'con_inverso' && datos.fechaDelInverso !== null) return datos.fechaDelInverso;
  return datos.hoy > fechaDeLiquidacion ? datos.hoy : fechaDeLiquidacion;
}

/** La fecha más reciente entre la entrega y el último gasto: antes de ella no se puede liquidar. */
export const fechaMinimaDeLiquidacion = (anticipo: Pick<Anticipo, 'fecha'>, ultimoGasto: string | null): string =>
  ultimoGasto !== null && ultimoGasto > anticipo.fecha ? ultimoGasto : anticipo.fecha;
