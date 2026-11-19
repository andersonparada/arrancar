import {
  LineaDescartada,
  LineaNoCapitalizable,
  LineaSobrecapitalizada,
  MontoDeCostoInvalido,
} from './errores-de-costo.js';
import type { ClaseDeCosto, ClaseDeCostoElegible } from './tipos-de-costo.js';

/** Una línea del Libro de compras vista desde Activos fijos: lo que costó y cuánto de eso ya se capitalizó. */
export interface LineaCapitalizable {
  lineaId: string;
  documentoId: string;
  /** Familia del documento (`factura`, `nota_de_credito`, `nota_de_debito`…): es del libro, aquí solo se compara. */
  tipoDeDocumento: string;
  documentoVigente: boolean;
  fechaEmision: string;
  esActivoFijo: boolean;
  /** Lo que costó la línea, siempre positivo: `total − iva + iva no acreditable`. */
  costoCentavos: number;
  descartada: boolean;
  /** En una nota de crédito: si su factura tiene costos vigentes (la nota entra a la bandeja aunque no esté marcada). */
  facturaCapitalizada: boolean;
  /** Suma de los costos vigentes de la línea, con signo. */
  capitalizadoCentavos: number;
}

const esNotaDeCredito = (linea: LineaCapitalizable): boolean => linea.tipoDeDocumento === 'nota_de_credito';

/** El costo de la línea con signo: la nota de crédito resta. */
export function costoFirmado(linea: LineaCapitalizable): number {
  return esNotaDeCredito(linea) ? -linea.costoCentavos : linea.costoCentavos;
}

/** Lo que falta por capitalizar de la línea, con signo. */
export function pendienteFirmado(linea: LineaCapitalizable): number {
  return costoFirmado(linea) - linea.capitalizadoCentavos;
}

/**
 * Una línea entra a la bandeja si su documento está vigente y la marcó como activo fijo, o si es de una nota de crédito
 * cuya factura ya tiene costos.
 * @throws LineaNoCapitalizable si el documento está anulado o la línea no es de activo fijo.
 * @throws LineaDescartada si se descartó en la bandeja.
 */
export function exigirCapitalizable(linea: LineaCapitalizable): void {
  const marcada = linea.esActivoFijo || (esNotaDeCredito(linea) && linea.facturaCapitalizada);
  if (!linea.documentoVigente || !marcada) throw new LineaNoCapitalizable();
  if (linea.descartada) throw new LineaDescartada();
}

/** Las notas fijan la clase de costo solas; en las demás documentos se elige (por omisión, adquisición). */
export function claseDeCostoDeLinea(linea: LineaCapitalizable, elegida: ClaseDeCostoElegible | null): ClaseDeCosto {
  if (esNotaDeCredito(linea)) return 'nota_de_credito';
  if (linea.tipoDeDocumento === 'nota_de_debito') return 'nota_de_debito';
  return elegida ?? 'adquisicion';
}

/**
 * Un costo de la línea suma si la línea suma y resta si es una nota de crédito.
 * @throws MontoDeCostoInvalido si el monto es cero o tiene el signo contrario.
 */
export function exigirSignoDeLinea(linea: LineaCapitalizable, montoCentavos: number): void {
  if (!Number.isInteger(montoCentavos) || montoCentavos === 0)
    throw new MontoDeCostoInvalido('Escriba un monto distinto de cero.');
  if (montoCentavos < 0 !== costoFirmado(linea) < 0)
    throw new MontoDeCostoInvalido('El monto debe tener el signo de la línea: las notas de crédito restan.');
}

/**
 * La regla de la línea: Σ montos vigentes ≤ su costo (en una nota de crédito, ≥ su costo negativo).
 * @throws LineaSobrecapitalizada si con `nuevoCentavos` se pasa.
 */
export function exigirCapacidadDeLinea(linea: LineaCapitalizable, nuevoCentavos: number): void {
  const costo = costoFirmado(linea);
  const total = linea.capitalizadoCentavos + nuevoCentavos;
  const dentro = costo >= 0 ? total >= 0 && total <= costo : total <= 0 && total >= costo;
  if (!dentro) throw new LineaSobrecapitalizada(pendienteFirmado(linea));
}
