import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { CifrasDeVentasEnLaFoto } from './foto-del-periodo.js';

/** Las claves de las cifras de ventas que el cálculo lee (las responde el módulo de ventas con la clave `ventas`). */
export const CIFRAS_DE_VENTAS = {
  /** Débito fiscal del IVA del mes (SAT-2237). */
  debito: 'debito',
  /** Retenciones de IVA con constancia aplicadas al mes (SAT-2237 y constancias del SAT-2046). */
  retenciones: 'retenciones_de_iva',
  /** Ingresos del mes (SAT-2046). */
  ingresos: 'ingresos',
} as const;

/** El pequeño contribuyente paga el 5 % de sus ingresos del mes. */
const PORCENTAJE_DEL_PEQUENO = 5;

export type FormularioConRemanente = 'SAT-2237' | 'SAT-2046';

/** Solo estos dos formularios llevan remanente de retenciones. */
export function esFormularioConRemanente(formulario: string | null | undefined): formulario is FormularioConRemanente {
  return formulario === 'SAT-2237' || formulario === 'SAT-2046';
}

/**
 * Lo que pasa de las retenciones de un mes al siguiente, aparte del remanente del crédito fiscal. En el SAT-2046 son las
 * constancias del 5 % (`retencionesDelPeriodo` = constancias del período). Los montos son texto con dos decimales.
 */
export interface RemanentesDeRetenciones {
  formulario: FormularioConRemanente;
  retencionesDelPeriodo: string;
  remanenteAnterior: string;
  /** El impuesto del mes antes de las retenciones: débito menos crédito (SAT-2237) o 5 % de ingresos (SAT-2046). */
  impuestoDelMes: string;
  /** Lo que queda por pagar después de las retenciones y del remanente anterior. */
  impuestoAPagar: string;
  remanenteAlSiguiente: string;
}

export interface EntradaDeRemanentes {
  formulario: FormularioConRemanente;
  ventas: CifrasDeVentasEnLaFoto[];
  /** El crédito fiscal del período (solo cuenta en el SAT-2237). */
  creditoCentavos: number;
  anteriorCentavos: number;
}

function sumaDe(ventas: CifrasDeVentasEnLaFoto[], clave: string): number {
  return ventas
    .filter((respuesta) => respuesta.clave === 'ventas')
    .flatMap((respuesta) => respuesta.cifras)
    .filter((cifra) => cifra.clave === clave)
    .reduce((total, cifra) => total + aCentavos(cifra.valor), 0);
}

function impuestoDelMes(entrada: EntradaDeRemanentes): number {
  if (entrada.formulario === 'SAT-2046') {
    return Math.round((sumaDe(entrada.ventas, CIFRAS_DE_VENTAS.ingresos) * PORCENTAJE_DEL_PEQUENO) / 100);
  }
  return Math.max(0, sumaDe(entrada.ventas, CIFRAS_DE_VENTAS.debito) - entrada.creditoCentavos);
}

/**
 * Remanente de retenciones del período: máx(0, retenciones + anterior − impuesto del mes). Sin respuesta de ventas no
 * hay nada que calcular (`null`). Función pura, en centavos enteros.
 */
export function calcularRemanentesDeRetenciones(entrada: EntradaDeRemanentes): RemanentesDeRetenciones | null {
  const respondieron = entrada.ventas.some((r) => r.clave === 'ventas' && r.cifras.length > 0);
  if (!respondieron) return null;
  const retenciones = sumaDe(entrada.ventas, CIFRAS_DE_VENTAS.retenciones);
  const impuesto = impuestoDelMes(entrada);
  const disponible = retenciones + entrada.anteriorCentavos;
  return {
    formulario: entrada.formulario,
    retencionesDelPeriodo: deCentavos(retenciones),
    remanenteAnterior: deCentavos(entrada.anteriorCentavos),
    impuestoDelMes: deCentavos(impuesto),
    impuestoAPagar: deCentavos(Math.max(0, impuesto - disponible)),
    remanenteAlSiguiente: deCentavos(Math.max(0, disponible - impuesto)),
  };
}
