import { etiquetaDe, type DocumentoPorPagar } from './documento-por-pagar.js';
import {
  AplicacionMayorQueElSaldo,
  AplicacionMayorQueElSaldoLibre,
  CargoNoDisponible,
  CargoRepetido,
  FechaDeAplicacionInvalida,
  MontoDeAplicacionInvalido,
  NoEsNotaConSaldo,
  ReferenciaDeAplicacionInvalida,
} from './errores-de-aplicaciones.js';
import { repartirNotaDeCredito, type AplicacionACargo } from './reparto-de-nota-de-credito.js';
import { claseDe } from './tipos-de-documento.js';

const MAXIMO_DE_LA_REFERENCIA = 100;

/** Un cargo con lo que todavía se debe de él, en centavos. */
export interface CargoConSaldoParaAplicar {
  documento: DocumentoPorPagar;
  saldoCentavos: number;
}

/** Una nota de crédito con su saldo libre, en centavos. */
export interface NotaConSaldoParaAplicar {
  documento: DocumentoPorPagar;
  saldoLibreCentavos: number;
}

/**
 * Los montos pedidos, ya en centavos y sin repetir cargo.
 * @throws MontoDeAplicacionInvalido si algún monto no es mayor que cero.
 * @throws CargoRepetido si un cargo aparece dos veces.
 */
export function exigirLineasValidas(lineas: readonly AplicacionACargo[]): void {
  const vistos = new Set<string>();
  lineas.forEach(({ cargoId, montoCentavos }, indice) => {
    if (montoCentavos <= 0) throw new MontoDeAplicacionInvalido(indice);
    if (vistos.has(cargoId)) throw new CargoRepetido(indice);
    vistos.add(cargoId);
  });
}

/** @throws NoEsNotaConSaldo si no es una nota de crédito o está anulada (vale pendiente, registrada o autorizada). */
export function exigirNotaQueSeAplica(nota: DocumentoPorPagar): void {
  if (nota.tipo !== 'nota_de_credito' || nota.estado === 'anulado') throw new NoEsNotaConSaldo(etiquetaDe(nota));
}

/** @throws CargoNoDisponible si no es un cargo vigente del mismo proveedor de la nota. */
export function exigirCargoDisponible(nota: DocumentoPorPagar, cargo: DocumentoPorPagar, indice: number): void {
  const disponible =
    claseDe(cargo.tipo) === 'cargo' && cargo.estado !== 'anulado' && cargo.proveedorId === nota.proveedorId;
  if (!disponible) throw new CargoNoDisponible(etiquetaDe(cargo), indice);
}

/**
 * Cada monto cabe en el saldo de su cargo y la suma cabe en el saldo libre de la nota.
 * @throws AplicacionMayorQueElSaldo, AplicacionMayorQueElSaldoLibre
 */
export function exigirMontosQueCaben(
  nota: NotaConSaldoParaAplicar,
  cargos: ReadonlyMap<string, CargoConSaldoParaAplicar>,
  lineas: readonly AplicacionACargo[],
): void {
  lineas.forEach(({ cargoId, montoCentavos }, indice) => {
    const cargo = cargos.get(cargoId)!;
    if (montoCentavos > cargo.saldoCentavos) {
      throw new AplicacionMayorQueElSaldo(etiquetaDe(cargo.documento), cargo.saldoCentavos, indice);
    }
  });
  const suma = lineas.reduce((total, { montoCentavos }) => total + montoCentavos, 0);
  if (suma > nota.saldoLibreCentavos) {
    throw new AplicacionMayorQueElSaldoLibre(etiquetaDe(nota.documento), nota.saldoLibreCentavos);
  }
}

/** Lo que fija la fecha de una aplicación: la recepción de cada documento y la fecha de inicio de la empresa. */
export interface OrigenesDeFecha {
  /** La recepción en el Libro de compras de cada documento; nula en un saldo inicial. */
  recepciones: ReadonlyArray<string | null>;
  fechaDeInicio: string | null;
}

/**
 * La fecha más reciente que la aplicación no puede preceder: la recepción de cada documento y, si alguno es un saldo
 * inicial (sin recepción), la fecha de inicio. `null` si nada la limita.
 */
export function fechaMinimaDeAplicacion({ recepciones, fechaDeInicio }: OrigenesDeFecha): string | null {
  const fechas = recepciones.map((recepcion) => recepcion ?? fechaDeInicio).filter((fecha) => fecha !== null);
  return fechas.length === 0 ? null : fechas.reduce((mayor, fecha) => (fecha > mayor ? fecha : mayor));
}

/**
 * La fecha del acuerdo: no futura y no anterior a la mínima. Un saldo inicial en una empresa sin fecha de inicio no
 * debería existir; si ocurre, se rechaza.
 * @throws FechaDeAplicacionInvalida
 */
export function exigirFechaDeAplicacion(fecha: string, hoy: string, origenes: OrigenesDeFecha): void {
  const minima = fechaMinimaDeAplicacion(origenes);
  const sinInicio = origenes.fechaDeInicio === null && origenes.recepciones.includes(null);
  if (sinInicio || fecha > hoy || (minima !== null && fecha < minima)) throw new FechaDeAplicacionInvalida(minima);
}

/** La referencia del acuerdo sin espacios sobrantes; vacía es nula. @throws ReferenciaDeAplicacionInvalida si pasa de 100. */
export function referenciaDelAcuerdo(referencia: string | null | undefined): string | null {
  const limpia = referencia?.trim() ?? '';
  if (limpia.length > MAXIMO_DE_LA_REFERENCIA) throw new ReferenciaDeAplicacionInvalida(MAXIMO_DE_LA_REFERENCIA);
  return limpia === '' ? null : limpia;
}

/** Un cargo que se ofrece para aplicar, con lo necesario para ordenarlo. */
export interface CargoParaProponer {
  id: string;
  saldoCentavos: number;
  autorizado: boolean;
  vencimiento: string | null;
  fechaEmision: string;
}

const AL_FINAL = '9999-12-31';

function comparar(a: CargoParaProponer, b: CargoParaProponer): number {
  if (a.autorizado !== b.autorizado) return a.autorizado ? -1 : 1;
  return (
    (a.vencimiento ?? AL_FINAL).localeCompare(b.vencimiento ?? AL_FINAL) ||
    a.fechaEmision.localeCompare(b.fechaEmision) ||
    a.id.localeCompare(b.id)
  );
}

/**
 * Los cargos en el orden en que se ofrecen (primero los autorizados; dentro de cada grupo, el que vence antes y el
 * emitido antes) y el monto que se propone aplicar a cada uno, repartiendo el saldo libre de la nota en ese orden.
 */
export function proponerReparto<T extends CargoParaProponer>(
  saldoLibreCentavos: number,
  cargos: readonly T[],
): Array<{ cargo: T; propuestoCentavos: number }> {
  const ordenados = [...cargos].sort(comparar);
  const { aplicaciones } = repartirNotaDeCredito(saldoLibreCentavos, ordenados);
  const montos = new Map(aplicaciones.map(({ cargoId, montoCentavos }) => [cargoId, montoCentavos]));
  return ordenados.map((cargo) => ({ cargo, propuestoCentavos: montos.get(cargo.id) ?? 0 }));
}

/** El aviso de bancarización se muestra desde este total del cargo. */
export function superaElUmbralDeBancarizacion(totalCentavos: number, umbralCentavos: number): boolean {
  return totalCentavos >= umbralCentavos;
}
