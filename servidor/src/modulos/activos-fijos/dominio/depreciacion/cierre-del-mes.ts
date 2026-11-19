import type { IncisoFiscal } from '../incisos-fiscales.js';
import { cuotaDelTramoEnElMes, tramoQueRige } from './cuota-del-mes.js';
import type { LibroDeDepreciacion, TramoGuardado } from './tramo.js';

const LIBROS: readonly LibroDeDepreciacion[] = ['contable', 'fiscal'];

/** Un activo con todo lo que el cierre del mes necesita para calcularle la cuota de cada libro. */
export interface ActivoParaCerrar {
  activoId: string;
  codigo: string;
  claseId: string;
  incisoFiscal: IncisoFiscal;
  localidadId: string | null;
  departamentoId: string | null;
  ocioso: boolean;
  /** Los tramos vigentes de los dos libros. */
  tramos: readonly TramoGuardado[];
  /** Lo que las cuotas vigentes ya depreciaron de cada tramo (por id del tramo). */
  depreciadoPorTramo: ReadonlyMap<string, number>;
  /** La acumulada de cada libro al cierre del mes anterior (`acumuladaAl`, §7.6). */
  acumuladaCentavos: Readonly<Record<LibroDeDepreciacion, number>>;
}

/** La cuota de un activo en un libro, lista para guardarse (§5.10). */
export interface CuotaDelMes {
  activoId: string;
  codigo: string;
  claseId: string;
  incisoFiscal: IncisoFiscal;
  libro: LibroDeDepreciacion;
  tramoId: string;
  montoCentavos: number;
  /** La acumulada del libro después de esta cuota. */
  acumuladaCentavos: number;
  localidadId: string | null;
  departamentoId: string | null;
  ocioso: boolean;
}

/** Lo que una nota de crédito bajó por debajo del residual (contable) o de lo ya depreciado (fiscal) en un tramo que abre el mes. */
export interface ExcesoDelMes {
  activoId: string;
  codigo: string;
  libro: LibroDeDepreciacion;
  montoCentavos: number;
}

export interface CierreCalculado {
  cuotas: CuotaDelMes[];
  excesos: ExcesoDelMes[];
}

/** El tramo que rige el mes en el libro y lo que da de cuota; `null` si el libro todavía no tiene tramo. */
function calculoDelLibro(activo: ActivoParaCerrar, libro: LibroDeDepreciacion, periodo: string) {
  const tramo = tramoQueRige(
    activo.tramos.filter((candidato) => candidato.libro === libro),
    periodo,
  );
  if (!tramo) return null;
  const depreciadoDelTramoCentavos = activo.depreciadoPorTramo.get(tramo.id) ?? 0;
  return { tramo, montoCentavos: cuotaDelTramoEnElMes({ tramo, periodo, depreciadoDelTramoCentavos }) };
}

function cuotaDe(
  activo: ActivoParaCerrar,
  libro: LibroDeDepreciacion,
  calculo: NonNullable<ReturnType<typeof calculoDelLibro>>,
) {
  const { activoId, codigo, claseId, incisoFiscal, localidadId, departamentoId, ocioso } = activo;
  const { tramo, montoCentavos } = calculo;
  const acumuladaCentavos = activo.acumuladaCentavos[libro] + montoCentavos;
  return {
    ...{ activoId, codigo, claseId, incisoFiscal, libro, localidadId, departamentoId, ocioso },
    ...{ tramoId: tramo.id, montoCentavos, acumuladaCentavos },
  } satisfies CuotaDelMes;
}

/**
 * Calcula las cuotas del mes de cada activo y libro (§6.9): el tramo que rige el mes da la cuota (§7); una cuota en cero
 * (tramo agotado) no se guarda. La acumulada avanza igual para el activo ocioso (V-4). Puro: no toca la base y da lo
 * mismo cada vez que se repite.
 */
export function calcularCierre(periodo: string, activos: readonly ActivoParaCerrar[]): CierreCalculado {
  const resultado: CierreCalculado = { cuotas: [], excesos: [] };
  for (const activo of activos) {
    for (const libro of LIBROS) {
      const calculo = calculoDelLibro(activo, libro, periodo);
      if (!calculo) continue;
      const { tramo, montoCentavos } = calculo;
      if (tramo.desdePeriodo === periodo && tramo.excesoDeNotaDeCreditoCentavos > 0)
        resultado.excesos.push({
          activoId: activo.activoId,
          codigo: activo.codigo,
          libro,
          montoCentavos: tramo.excesoDeNotaDeCreditoCentavos,
        });
      if (montoCentavos > 0) resultado.cuotas.push(cuotaDe(activo, libro, calculo));
    }
  }
  return resultado;
}

export interface TotalesDelCierre {
  contableCentavos: number;
  fiscalCentavos: number;
  /** Activos con al menos una cuota en el mes. */
  activosDepreciados: number;
}

export function totalesDelCierre(cuotas: readonly CuotaDelMes[]): TotalesDelCierre {
  const sumaDe = (libro: LibroDeDepreciacion) =>
    cuotas.filter((cuota) => cuota.libro === libro).reduce((total, cuota) => total + cuota.montoCentavos, 0);
  return {
    contableCentavos: sumaDe('contable'),
    fiscalCentavos: sumaDe('fiscal'),
    activosDepreciados: new Set(cuotas.map((cuota) => cuota.activoId)).size,
  };
}
