import { CAUSAS_DE_AJUSTE, type CausaDeAjuste } from './ajustes.js';
import { fechaMinimaDeAplicacion, referenciaDelAcuerdo } from './aplicacion-manual.js';
import { etiquetaDe, type DocumentoPorPagar } from './documento-por-pagar.js';
import {
  AjusteMayorQueElSaldoLibre,
  CausaDeAjusteInvalida,
  DiferenciaMenorSobreElTope,
  FechaDeAjusteInvalida,
  MontoDeAjusteInvalido,
  NotaPendienteNoSeAjusta,
  ReferenciaObligatoria,
} from './errores-de-ajustes.js';
import { NoEsNotaConSaldo } from './errores-de-aplicaciones.js';

/** Lo que se pide para ajustar, ya con el monto en centavos. */
export interface DatosDelAjuste {
  montoCentavos: number;
  causa: string;
  referencia: string | null | undefined;
}

/** Los datos del ajuste ya validados. */
export interface AjusteValido {
  montoCentavos: number;
  causa: CausaDeAjuste;
  referencia: string | null;
}

/**
 * Solo una nota de crédito registrada o autorizada se ajusta.
 * @throws NotaPendienteNoSeAjusta si sigue en la bandeja.
 * @throws NoEsNotaConSaldo si está anulada o no es nota de crédito.
 */
export function exigirNotaQueSeAjusta(nota: DocumentoPorPagar): void {
  if (nota.tipo !== 'nota_de_credito' || nota.estado === 'anulado') throw new NoEsNotaConSaldo(etiquetaDe(nota));
  if (nota.estado === 'pendiente') throw new NotaPendienteNoSeAjusta(etiquetaDe(nota));
}

/**
 * Causa conocida, monto entre cero y el saldo libre, tope de la diferencia menor y referencia (obligatoria al compensar
 * con otra cuenta).
 * @throws CausaDeAjusteInvalida, MontoDeAjusteInvalido, AjusteMayorQueElSaldoLibre, DiferenciaMenorSobreElTope,
 * ReferenciaObligatoria, ReferenciaDeAplicacionInvalida
 */
export function validarAjuste(
  nota: { documento: DocumentoPorPagar; saldoLibreCentavos: number },
  datos: DatosDelAjuste,
  topeCentavos: number,
): AjusteValido {
  const causa = CAUSAS_DE_AJUSTE.find((clave) => clave === datos.causa);
  if (!causa) throw new CausaDeAjusteInvalida();
  const { montoCentavos } = datos;
  if (montoCentavos <= 0) throw new MontoDeAjusteInvalido();
  if (montoCentavos > nota.saldoLibreCentavos) {
    throw new AjusteMayorQueElSaldoLibre(etiquetaDe(nota.documento), nota.saldoLibreCentavos);
  }
  if (causa === 'diferencia_menor' && montoCentavos > topeCentavos) throw new DiferenciaMenorSobreElTope(topeCentavos);
  const referencia = referenciaDelAcuerdo(datos.referencia);
  if (causa === 'compensado_con_otra_cuenta' && referencia === null) throw new ReferenciaObligatoria();
  return { montoCentavos, causa, referencia };
}

/** La fecha más reciente que el ajuste no puede preceder: la recepción de la nota o, en un saldo inicial, la fecha de inicio. */
export function fechaMinimaDeAjuste(recepcion: string | null, fechaDeInicio: string | null): string | null {
  return fechaMinimaDeAplicacion({ recepciones: [recepcion], fechaDeInicio });
}

/** @throws FechaDeAjusteInvalida si es futura o anterior a la mínima (o la nota es saldo inicial y no hay fecha de inicio). */
export function exigirFechaDeAjuste(
  fecha: string,
  hoy: string,
  origen: { recepcion: string | null; fechaDeInicio: string | null },
): void {
  const minima = fechaMinimaDeAjuste(origen.recepcion, origen.fechaDeInicio);
  const sinInicio = origen.recepcion === null && origen.fechaDeInicio === null;
  if (sinInicio || fecha > hoy || (minima !== null && fecha < minima)) throw new FechaDeAjusteInvalida(minima);
}
