import { naturalezaDelSaldo, TRAMOS_DE_ANTIGUEDAD, type TramoDeAntiguedad } from './saldo-al-corte.js';

/** El NIT de consumidor final no identifica a nadie: esos proveedores nunca se agrupan entre sí. */
const NIT_CONSUMIDOR_FINAL = 'CF';

/** Las cifras de un proveedor o de un NIT al corte, en centavos (los cargos en sus tramos y los saldos a favor aparte). */
export interface CifrasDeSaldo {
  /** El saldo de los cargos por tramo de antigüedad (por «Vence»). */
  tramos: Record<TramoDeAntiguedad, number>;
  totalCargos: number;
  saldosAFavor: number;
  /** Cargos menos saldos a favor: positivo, se le debe; negativo, nos debe. */
  neto: number;
  /** Cheques posfechados ya entregados (§2.1). */
  comprometido: number;
  /** La parte de los cargos que todavía no está autorizada. */
  sinAutorizar: number;
}

/** Un proveedor (una ficha) con sus cifras al corte. */
export interface SaldoDeProveedor extends CifrasDeSaldo {
  proveedorId: string;
  nombre: string;
  nit: string | null;
}

/** Lo que se le debe pagar o nos debe un NIT, con las fichas de proveedor que lo forman. */
export interface SaldoDeNit extends CifrasDeSaldo {
  /** El NIT real; `null` en los proveedores sin NIT o con «CF», que son un grupo cada uno. */
  nit: string | null;
  nombre: string;
  /** La ficha, si el grupo tiene una sola; `null` si el NIT está en varias. */
  proveedorId: string | null;
  fichas: SaldoDeProveedor[];
}

const CERO_POR_TRAMO = (): Record<TramoDeAntiguedad, number> => ({
  por_vencer: 0,
  de_1_a_30: 0,
  de_31_a_60: 0,
  de_61_a_90: 0,
  mas_de_90: 0,
  sin_vencimiento: 0,
});

/** Cifras en cero, para empezar a sumar. */
export const cifrasEnCero = (): CifrasDeSaldo => ({
  tramos: CERO_POR_TRAMO(),
  totalCargos: 0,
  saldosAFavor: 0,
  neto: 0,
  comprometido: 0,
  sinAutorizar: 0,
});

/** La suma de dos juegos de cifras. */
export function sumarCifras(a: CifrasDeSaldo, b: CifrasDeSaldo): CifrasDeSaldo {
  const tramos = CERO_POR_TRAMO();
  for (const tramo of [...TRAMOS_DE_ANTIGUEDAD, 'sin_vencimiento'] as const)
    tramos[tramo] = a.tramos[tramo] + b.tramos[tramo];
  return {
    tramos,
    totalCargos: a.totalCargos + b.totalCargos,
    saldosAFavor: a.saldosAFavor + b.saldosAFavor,
    neto: a.neto + b.neto,
    comprometido: a.comprometido + b.comprometido,
    sinAutorizar: a.sinAutorizar + b.sinAutorizar,
  };
}

/** El NIT que identifica a alguien; `null` si no tiene o es «CF». */
function nitReal(nit: string | null): string | null {
  const limpio = nit?.trim().toUpperCase() ?? '';
  return limpio === '' || limpio === NIT_CONSUMIDOR_FINAL ? null : limpio;
}

/** La clave del grupo: el NIT, o el proveedor mismo si no tiene NIT real. */
const claveDeGrupo = ({ nit, proveedorId }: SaldoDeProveedor): string => nitReal(nit) ?? `proveedor:${proveedorId}`;

const porNombre = (a: SaldoDeProveedor, b: SaldoDeProveedor) =>
  a.nombre.localeCompare(b.nombre, 'es') || a.proveedorId.localeCompare(b.proveedorId);

function aGrupo(fichas: SaldoDeProveedor[]): SaldoDeNit {
  const ordenadas = [...fichas].sort(porNombre);
  const [primera] = ordenadas as [SaldoDeProveedor, ...SaldoDeProveedor[]];
  const cifras = ordenadas.reduce<CifrasDeSaldo>((suma, ficha) => sumarCifras(suma, ficha), cifrasEnCero());
  const unica = ordenadas.length === 1;
  return {
    ...cifras,
    nit: nitReal(primera.nit),
    nombre: primera.nombre,
    proveedorId: unica ? primera.proveedorId : null,
    fichas: ordenadas,
  };
}

/**
 * Junta los proveedores por NIT (la compensación es entre el mismo acreedor y deudor, no entre proveedores distintos).
 * Sin NIT o con «CF», cada proveedor es su propio grupo.
 */
export function agruparPorNit(proveedores: readonly SaldoDeProveedor[]): SaldoDeNit[] {
  const grupos = new Map<string, SaldoDeProveedor[]>();
  for (const proveedor of proveedores) {
    const clave = claveDeGrupo(proveedor);
    grupos.set(clave, [...(grupos.get(clave) ?? []), proveedor]);
  }
  return [...grupos.values()].map(aGrupo).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Los NIT que están en más de una ficha de proveedor. */
export const nitEnVariasFichas = (grupos: readonly SaldoDeNit[]): SaldoDeNit[] =>
  grupos.filter((grupo) => grupo.nit !== null && grupo.fichas.length > 1);

export interface BloquesDeSaldo {
  acreedores: SaldoDeNit[];
  deudores: SaldoDeNit[];
}

/**
 * Reparte los grupos en acreedores (neto positivo) y deudores (neto negativo). Los que quedan en cero se omiten, salvo
 * con `incluirSinSaldo`, que los pone en acreedores.
 */
export function repartirEnBloques(grupos: readonly SaldoDeNit[], incluirSinSaldo: boolean): BloquesDeSaldo {
  const acreedores: SaldoDeNit[] = [];
  const deudores: SaldoDeNit[] = [];
  for (const grupo of grupos) {
    const naturaleza = naturalezaDelSaldo(grupo.neto);
    if (naturaleza === 'deudor') deudores.push(grupo);
    else if (naturaleza === 'acreedor' || incluirSinSaldo) acreedores.push(grupo);
  }
  return { acreedores, deudores };
}
