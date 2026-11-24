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

/**
 * Lo que trae de los meses anteriores el período, en centavos: retenciones (o constancias) y crédito fiscal. `null` es
 * «sin dato»: no se sabe con qué saldo cerró el mes previo (no es cero) y no se puede calcular el cierre de este mes.
 */
export interface SaldosAnteriores {
  retencionesCentavos: number | null;
  /** El remanente del crédito fiscal que dejó el mes previo (solo cuenta en el SAT-2237). */
  creditoCentavos: number | null;
  /** Por qué falta algún saldo y qué hacer; solo cuando falta. */
  aviso?: string | undefined;
}

/** Los saldos que el cálculo necesita: las retenciones siempre; el crédito fiscal solo en el SAT-2237. */
export interface SaldosConocidos {
  retencionesCentavos: number;
  creditoCentavos: number;
}

/** `null` si falta algún saldo que el formulario necesita. */
export function saldosConocidos(formulario: FormularioConRemanente, saldos: SaldosAnteriores): SaldosConocidos | null {
  const { retencionesCentavos, creditoCentavos } = saldos;
  if (retencionesCentavos === null) return null;
  if (formulario === 'SAT-2046') return { retencionesCentavos, creditoCentavos: 0 };
  return creditoCentavos === null ? null : { retencionesCentavos, creditoCentavos };
}

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
  /** El remanente del crédito fiscal con que empezó el mes (SAT-2237; cero en el SAT-2046). Ausente en fotos viejas. */
  creditoAnterior?: string;
  /**
   * El impuesto del mes antes de las retenciones: débito menos crédito y remanente de crédito, sin bajar de cero
   * (SAT-2237), o 5 % de ingresos sin bajar de cero (SAT-2046).
   */
  impuestoDelMes: string;
  /** El crédito fiscal que sobró este mes y pasa al siguiente (SAT-2237). Ausente en fotos viejas. */
  creditoAlSiguiente?: string;
  /** Lo que queda por pagar después de las retenciones y del remanente anterior. */
  impuestoAPagar: string;
  remanenteAlSiguiente: string;
}

export interface EntradaDeRemanentes {
  formulario: FormularioConRemanente;
  ventas: CifrasDeVentasEnLaFoto[];
  /** El crédito fiscal del período (solo cuenta en el SAT-2237). */
  creditoCentavos: number;
  anterior: SaldosConocidos;
}

function sumaDe(ventas: CifrasDeVentasEnLaFoto[], clave: string): number {
  return ventas
    .filter((respuesta) => respuesta.clave === 'ventas')
    .flatMap((respuesta) => respuesta.cifras)
    .filter((cifra) => cifra.clave === clave)
    .reduce((total, cifra) => total + aCentavos(cifra.valor), 0);
}

/** Lo que el mes debe antes de retenciones y lo que sobra de crédito fiscal para el siguiente; ninguno baja de cero. */
function impuestoYCredito(entrada: EntradaDeRemanentes): { impuesto: number; credito: number } {
  if (entrada.formulario === 'SAT-2046') {
    const ingresos = sumaDe(entrada.ventas, CIFRAS_DE_VENTAS.ingresos);
    return { impuesto: Math.max(0, Math.round((ingresos * PORCENTAJE_DEL_PEQUENO) / 100)), credito: 0 };
  }
  const saldo =
    sumaDe(entrada.ventas, CIFRAS_DE_VENTAS.debito) - entrada.creditoCentavos - entrada.anterior.creditoCentavos;
  return { impuesto: Math.max(0, saldo), credito: Math.max(0, -saldo) };
}

/**
 * El régimen derogado de pequeño contribuyente electrónico es solo histórico (SAT-2241): no lleva este cálculo aunque
 * comparta formulario con el pequeño contribuyente.
 */
export function llevaCalculoDeRemanente(regimen: string | null | undefined): boolean {
  return regimen !== 'pequeno_contribuyente_electronico';
}

/**
 * Remanente de retenciones del período: máx(0, retenciones + anterior − impuesto del mes). En el SAT-2237 el impuesto
 * resta también el remanente de crédito fiscal anterior, y el crédito que sobra pasa al mes siguiente. Sin respuesta de ventas
 * (débito desconocido) o sin alguno de los saldos anteriores no se puede calcular el cierre (`null`). Función pura, en centavos enteros.
 */
export function calcularRemanentesDeRetenciones(
  entrada: Omit<EntradaDeRemanentes, 'anterior'> & { anterior: SaldosAnteriores },
): RemanentesDeRetenciones | null {
  const anterior = saldosConocidos(entrada.formulario, entrada.anterior);
  if (!anterior) return null;
  return calcularConSaldos({ ...entrada, anterior });
}

function calcularConSaldos(entrada: EntradaDeRemanentes): RemanentesDeRetenciones | null {
  const respondieron = entrada.ventas.some((r) => r.clave === 'ventas' && r.cifras.length > 0);
  if (!respondieron) return null;
  const retenciones = sumaDe(entrada.ventas, CIFRAS_DE_VENTAS.retenciones);
  const { impuesto, credito } = impuestoYCredito(entrada);
  const disponible = retenciones + entrada.anterior.retencionesCentavos;
  return {
    formulario: entrada.formulario,
    retencionesDelPeriodo: deCentavos(retenciones),
    remanenteAnterior: deCentavos(entrada.anterior.retencionesCentavos),
    creditoAnterior: deCentavos(entrada.formulario === 'SAT-2046' ? 0 : entrada.anterior.creditoCentavos),
    impuestoDelMes: deCentavos(impuesto),
    creditoAlSiguiente: deCentavos(credito),
    impuestoAPagar: deCentavos(Math.max(0, impuesto - disponible)),
    remanenteAlSiguiente: deCentavos(Math.max(0, disponible - impuesto)),
  };
}
