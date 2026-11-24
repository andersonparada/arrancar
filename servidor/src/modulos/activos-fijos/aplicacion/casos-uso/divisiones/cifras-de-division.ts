import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Activo } from '../../../dominio/activo.js';
import type { PropiedadesDeCosto } from '../../../dominio/costo.js';
import type { CifrasDeDivision } from '../../../dominio/depreciacion/division.js';
import {
  acumuladaAntesDe,
  desdeDelUltimoTramo,
  mesesQueFaltan,
} from '../../../dominio/depreciacion/estado-de-los-libros.js';
import { tramoQueRige } from '../../../dominio/depreciacion/cuota-del-mes.js';
import { periodoDe } from '../../../dominio/depreciacion/meses.js';
import { DivisionNoPermitida } from '../../../dominio/errores-de-division.js';
import type { IncisoFiscal } from '../../../dominio/incisos-fiscales.js';
import { baseFiscalDeUso } from '../activos/base-fiscal-de-uso.js';
import { cargarEstado } from '../mejoras/planear-cambio-de-libros.js';
import type { FiscalDelSaldo } from '../../puertos/repositorio-saldos-iniciales.js';
import type { DependenciasDeDivisiones } from './dependencias-de-divisiones.js';

/** Lo que hay que saber del activo para repartirlo: sus cifras, desde qué mes rigen los tramos y cuánta vida contable queda. */
export interface PreparacionDeDivision {
  cifras: CifrasDeDivision;
  /** El primer mes de los tramos de la división (y el `periodo` de la fila). */
  desde: string;
  /** Los meses contables que le faltaban al tramo del origen; `null` si ya no queda ninguno. */
  mesesQueFaltan: number | null;
  /** Si el activo tiene libros (un activo del balance en uso): solo entonces hay tramos y acumuladas. */
  conLibros: boolean;
}

const suma = (costos: readonly PropiedadesDeCosto[]): number => costos.reduce((total, c) => total + c.montoCentavos, 0);

/**
 * Un saldo inicial con costo fiscal distinto del contable o de su base no se reparte: la diferencia no tiene dónde caer
 * en el activo nuevo (§6.11).
 */
function exigirSaldoRepartible(costos: readonly PropiedadesDeCosto[], saldo: FiscalDelSaldo | null): void {
  if (!saldo) return;
  const contable = costos.find((costo) => costo.origen === 'saldo_inicial')?.montoCentavos;
  if (saldo.costoFiscalCentavos !== saldo.baseFiscalCentavos || saldo.costoFiscalCentavos !== contable)
    throw new DivisionNoPermitida('saldo_inicial_con_diferencias');
}

/** Los costos vigentes partidos entre los que aplican al libro fiscal y los que no. */
function costosDelActivo(costos: readonly PropiedadesDeCosto[]) {
  const costoQueAplicaCentavos = suma(costos.filter((costo) => costo.aplicaAlLibroFiscal));
  const costoQueNoAplicaCentavos = suma(costos.filter((costo) => !costo.aplicaAlLibroFiscal));
  if (costoQueAplicaCentavos < 0 || costoQueNoAplicaCentavos < 0) throw new DivisionNoPermitida('costos_negativos');
  return { costoQueAplicaCentavos, costoQueNoAplicaCentavos };
}

const SIN_LIBROS = { acumuladaContableCentavos: 0, acumuladaFiscalCentavos: 0, valorResidualCentavos: 0 };

interface PedidoDeCifras {
  activo: Activo;
  incisoFiscal: IncisoFiscal;
  fecha: string;
}

interface CifrasDelCosto {
  costoQueAplicaCentavos: number;
  costoQueNoAplicaCentavos: number;
}

interface PedidoConLibros extends PedidoDeCifras {
  costos: readonly PropiedadesDeCosto[];
  delCosto: CifrasDelCosto;
  saldo: FiscalDelSaldo | null;
}

/** Con libros: la acumulada de cada uno, el residual, la base fiscal y la base del porcentaje del tramo fiscal vigente. */
async function cifrasConLibros(
  dependencias: DependenciasDeDivisiones,
  pedido: PedidoConLibros,
): Promise<PreparacionDeDivision> {
  const { activo, incisoFiscal, fecha, costos, delCosto, saldo } = pedido;
  const propiedades = activo.instantanea();
  const estado = await cargarEstado(dependencias, propiedades.id.valor);
  const desde = [periodoDe(fecha), desdeDelUltimoTramo(estado.tramos) ?? ''].sort().at(-1)!;
  const fiscales = estado.tramos.filter((tramo) => tramo.libro === 'fiscal');
  const ganado = propiedades.valorComoGanadoComun === null ? 0 : aCentavos(propiedades.valorComoGanadoComun);
  return {
    cifras: {
      ...delCosto,
      acumuladaContableCentavos: acumuladaAntesDe(estado, 'contable', desde),
      acumuladaFiscalCentavos: acumuladaAntesDe(estado, 'fiscal', desde),
      valorResidualCentavos: aCentavos(propiedades.valorResidual ?? '0'),
      baseFiscalCentavos: baseFiscalDeUso({ incisoFiscal, costos, inmueble: propiedades, ganado }, saldo),
      baseDelPorcentajeCentavos: tramoQueRige(fiscales, desde)?.baseDelPorcentajeCentavos ?? null,
    },
    desde,
    mesesQueFaltan: mesesQueFaltan(estado.tramos, desde),
    conLibros: true,
  };
}

/**
 * Las cifras del activo al día de la división (§7.6): costos que aplican y que no y, si tiene libros, la acumulada de
 * cada uno al cierre del mes anterior a los tramos nuevos (lo cerrado más lo que darían los meses abiertos que faltan), el
 * residual, la base fiscal y la base del porcentaje del tramo fiscal vigente. El activo debe estar bloqueado.
 * @throws DivisionNoPermitida si los costos son negativos o el saldo inicial no se reparte.
 */
export async function prepararCifras(
  dependencias: DependenciasDeDivisiones,
  pedido: PedidoDeCifras,
): Promise<PreparacionDeDivision> {
  const propiedades = pedido.activo.instantanea();
  const costos = (await dependencias.costos.vigentesDeActivo(propiedades.id.valor)).map((c) => c.instantanea());
  const saldo = await dependencias.saldos.fiscalDeActivo(propiedades.id.valor);
  exigirSaldoRepartible(costos, saldo);
  const delCosto = costosDelActivo(costos);
  if (propiedades.tipoDeRegistro === 'activo' && propiedades.estado === 'en_uso')
    return cifrasConLibros(dependencias, { ...pedido, costos, delCosto, saldo });
  return {
    cifras: { ...delCosto, ...SIN_LIBROS, baseFiscalCentavos: 0, baseDelPorcentajeCentavos: null },
    desde: periodoDe(pedido.fecha),
    mesesQueFaltan: null,
    conLibros: false,
  };
}
