import { BajaInvalida } from './errores-de-baja.js';
import type { CostoFiscalDeLaVenta, OrigenDelCostoFiscal } from './tipos-de-baja.js';

const MOTIVO_MAXIMO = 300;

/** Lo que dicen los datos fiscales de la empresa a la fecha de la venta; `null` si no hay datos fiscales. */
export interface DatosFiscalesDeLaVenta {
  tipoDePersona: 'individual' | 'juridica' | null;
  regimenDeIva: string | null;
  regimenDeIsr: string | null;
  /** «Lleva contabilidad completa» de los datos fiscales de la empresa; `null` si no hay datos fiscales. */
  llevaContabilidadCompleta: boolean | null;
}

/** Lo que escribe el contador para sostener un costo fiscal distinto del que da la regla. */
export interface CostoFiscalDelContador {
  montoCentavos: number;
  motivo: string;
}

export interface EntradaDelCostoFiscalDeControl {
  datosFiscales: DatosFiscalesDeLaVenta;
  /** Σ de los costos de referencia del bien con su documento de compra o de soporte. */
  documentadoCentavos: number;
  delContador: CostoFiscalDelContador | null;
}

interface CostoSegunLaRegla {
  costoFiscalCentavos: number;
  origen: OrigenDelCostoFiscal;
}

/** El costo fiscal que se guarda y, si el contador lo cambió, el que daba la regla (para dejar el rastro). */
export interface ResultadoDelCostoFiscal extends CostoSegunLaRegla {
  costoFiscal: CostoFiscalDeLaVenta;
  segunLaRegla: CostoSegunLaRegla;
}

/**
 * Si la empresa lleva contabilidad completa (ISR, art. 89), según la casilla de sus datos fiscales: la propone el
 * sistema por el tipo de persona y el régimen, y el contador la confirma. Sin datos fiscales se supone que sí (el costo
 * fiscal queda en cero, lo prudente).
 */
export function estaObligadaAContabilidadCompleta({ llevaContabilidadCompleta }: DatosFiscalesDeLaVenta): boolean {
  return llevaContabilidadCompleta !== false;
}

function segunLaRegla({ datosFiscales, documentadoCentavos }: EntradaDelCostoFiscalDeControl): CostoSegunLaRegla {
  if (estaObligadaAContabilidadCompleta(datosFiscales)) return { costoFiscalCentavos: 0, origen: 'en_libros' };
  if (documentadoCentavos > 0) return { costoFiscalCentavos: documentadoCentavos, origen: 'documentado' };
  return { costoFiscalCentavos: 0, origen: 'sin_documento' };
}

function delContadorValido({ montoCentavos, motivo }: CostoFiscalDelContador): CostoFiscalDelContador {
  if (!Number.isInteger(montoCentavos) || montoCentavos < 0)
    throw new BajaInvalida('El costo fiscal no puede ser negativo.');
  const limpio = motivo.trim();
  if (!limpio) throw new BajaInvalida('Escriba el motivo y el documento que respaldan el costo fiscal.');
  if (limpio.length > MOTIVO_MAXIMO)
    throw new BajaInvalida(`El motivo del costo fiscal no puede pasar de ${MOTIVO_MAXIMO} caracteres.`);
  return { montoCentavos, motivo: limpio };
}

/**
 * El costo fiscal al vender un bien de control (AF-9b), que no está en libros: quien está obligado a contabilidad completa
 * lo lleva en cero (ya lo dedujo como gasto); quien no, el costo documentado; sin documento, cero. El contador, con su
 * permiso, puede sostener otro monto con su motivo.
 * @throws BajaInvalida si el monto del contador es negativo o falta su motivo.
 */
export function costoFiscalDeControl(entrada: EntradaDelCostoFiscalDeControl): ResultadoDelCostoFiscal {
  const porLaRegla = segunLaRegla(entrada);
  if (!entrada.delContador)
    return { ...porLaRegla, costoFiscal: { origen: porLaRegla.origen, motivo: null }, segunLaRegla: porLaRegla };
  const { montoCentavos, motivo } = delContadorValido(entrada.delContador);
  return {
    costoFiscalCentavos: montoCentavos,
    origen: 'criterio_del_contador',
    costoFiscal: { origen: 'criterio_del_contador', motivo },
    segunLaRegla: porLaRegla,
  };
}
