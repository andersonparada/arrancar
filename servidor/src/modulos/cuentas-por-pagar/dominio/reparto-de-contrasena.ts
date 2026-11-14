import { repartirNotaDeCredito } from './reparto-de-nota-de-credito.js';

/** Un cargo de la contraseña con lo que todavía se debe de él. */
export interface CargoDeLaContrasena {
  id: string;
  saldoCentavos: number;
  vencimiento: string | null;
  fechaEmision: string;
  /** Instante de alta (ISO), para desempatar. */
  creadoEn: string;
  /** Su recepción en el libro de compras; en un saldo inicial, la fecha de inicio. Nula si nada la fija. */
  entrada: string | null;
}

/** Una nota de crédito de la contraseña con su saldo libre. */
export interface NotaDeLaContrasena {
  id: string;
  saldoLibreCentavos: number;
  fechaEmision: string;
  creadoEn: string;
  entrada: string | null;
}

/** Lo que una nota rebaja de un cargo dentro de la contraseña, desde `fecha`. */
export interface AplicacionDeContrasena {
  notaId: string;
  cargoId: string;
  montoCentavos: number;
  fecha: string;
}

export interface RepartoDeContrasena {
  aplicaciones: AplicacionDeContrasena[];
  /** Lo que queda por pagar de cada cargo después del reparto, en centavos. */
  saldoPorCargo: Map<string, number>;
}

const AL_FINAL = '9999-12-31';

type Ordenable = { fechaEmision: string; creadoEn: string; id: string };

const porAlta = (a: Ordenable, b: Ordenable): number =>
  a.fechaEmision.localeCompare(b.fechaEmision) || a.creadoEn.localeCompare(b.creadoEn) || a.id.localeCompare(b.id);

const porVencimiento = (a: CargoDeLaContrasena, b: CargoDeLaContrasena): number =>
  (a.vencimiento ?? AL_FINAL).localeCompare(b.vencimiento ?? AL_FINAL) || porAlta(a, b);

/** La mayor entre la fecha de la contraseña y las entradas de la nota y del cargo (dictamen C-CP3-2). */
export function fechaDeLaAplicacion(fecha: string, ...entradas: ReadonlyArray<string | null>): string {
  return entradas.reduce<string>((mayor, entrada) => (entrada !== null && entrada > mayor ? entrada : mayor), fecha);
}

/**
 * Reparte las notas de la contraseña entre sus cargos, de forma determinista: las notas por fecha de emisión y alta,
 * los cargos por vencimiento, emisión y alta. Cada nota rebaja los saldos que van quedando; lo que sobra sigue libre.
 * La fecha de cada aplicación es la mayor entre la contraseña, la entrada de la nota y la del cargo.
 */
export function repartirNotasDeLaContrasena(
  fecha: string,
  notas: readonly NotaDeLaContrasena[],
  cargos: readonly CargoDeLaContrasena[],
): RepartoDeContrasena {
  const ordenados = [...cargos].sort(porVencimiento);
  const saldoPorCargo = new Map(ordenados.map(({ id, saldoCentavos }) => [id, saldoCentavos]));
  const entradas = new Map(ordenados.map(({ id, entrada }) => [id, entrada]));
  const aplicaciones: AplicacionDeContrasena[] = [];
  for (const nota of [...notas].sort(porAlta)) {
    const restantes = ordenados.map(({ id }) => ({ id, saldoCentavos: saldoPorCargo.get(id)! }));
    for (const { cargoId, montoCentavos } of repartirNotaDeCredito(nota.saldoLibreCentavos, restantes).aplicaciones) {
      saldoPorCargo.set(cargoId, saldoPorCargo.get(cargoId)! - montoCentavos);
      const desde = fechaDeLaAplicacion(fecha, nota.entrada, entradas.get(cargoId)!);
      aplicaciones.push({ notaId: nota.id, cargoId, montoCentavos, fecha: desde });
    }
  }
  return { aplicaciones, saldoPorCargo };
}
