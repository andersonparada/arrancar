import { FechaDeLiquidacionInvalida, LiquidacionNoCuadra, MotivoDeFaltanteObligatorio } from './errores-de-retiros.js';

/** Lo que el usuario dice al liquidar: cuánto se deposita de vuelta y cuánto falta, en centavos. */
export interface LiquidacionPedida {
  devueltoCentavos: number;
  faltanteCentavos: number;
  motivoDeFaltante: string | null;
}

/**
 * Lo devuelto más el faltante es todo lo que no se pagó, y un faltante dice por qué. Devuelve el motivo que se guarda
 * (nulo sin faltante).
 * @throws LiquidacionNoCuadra, MotivoDeFaltanteObligatorio
 */
export function exigirLiquidacionCuadrada(sobranteCentavos: number, pedida: LiquidacionPedida): string | null {
  if (pedida.devueltoCentavos + pedida.faltanteCentavos !== sobranteCentavos) {
    throw new LiquidacionNoCuadra(sobranteCentavos);
  }
  if (pedida.faltanteCentavos === 0) return null;
  const motivo = pedida.motivoDeFaltante?.trim() ?? '';
  if (motivo === '') throw new MotivoDeFaltanteObligatorio();
  return motivo;
}

/**
 * La liquidación no es futura ni anterior al retiro ni a su último pago vigente.
 * @throws FechaDeLiquidacionInvalida
 */
export function exigirFechaDeLiquidacion(fecha: string, limites: { minima: string; hoy: string }): void {
  if (fecha > limites.hoy || fecha < limites.minima) throw new FechaDeLiquidacionInvalida(limites.minima);
}

/** El usuario que liquida es el custodio del retiro: conviene que lo haga otra persona (aviso, no bloquea). */
export const liquidaElCustodio = (custodioUsuarioId: string | null, usuarioId: string): boolean =>
  custodioUsuarioId !== null && custodioUsuarioId === usuarioId;
