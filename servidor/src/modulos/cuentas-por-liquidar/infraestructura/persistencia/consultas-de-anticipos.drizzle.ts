import { and, asc, desc, eq, gt, inArray, isNull, lt, lte, or, sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { cheques } from '../../../bancos/infraestructura/persistencia/cheques.tablas.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import type {
  AnticipoVencido,
  ConsultasDeAnticipos,
  FiltroDeAnticipos,
  GastadoDelAnticipo,
  PaginaDeAnticipos,
  RepartoDeLosGastos,
} from '../../aplicacion/puertos/puertos-de-anticipos.js';
import { anticipos } from './anticipos.tablas.js';
import { gastos } from './gastos.tablas.js';
import { aAnticipo } from './repositorio-de-anticipos.drizzle.js';

/** Los gastos que cuentan: los vigentes de hoy o, con corte, los de esa fecha o antes que seguían vigentes entonces. */
const gastoQueCuenta = (corte?: string): SQL =>
  corte
    ? sql`g.fecha <= ${corte} and (g.fecha_de_anulacion is null or g.fecha_de_anulacion > ${corte})`
    : sql`g.estado = 'vigente'`;

/** Lo gastado: los cargos suman y las notas de crédito restan. */
const gastado = (corte?: string): SQL =>
  sql`coalesce((select sum(case when g.resta then -g.monto else g.monto end) from ${gastos} g where g.anticipo_id = ${anticipos.id} and ${gastoQueCuenta(corte)}), 0)`;

/** Lo que falta por justificar: al corte, el monto menos lo gastado entonces; hoy, solo en los anticipos abiertos. */
const porJustificar = (corte?: string): SQL =>
  corte
    ? sql`(${anticipos.monto} - ${gastado(corte)})`
    : sql`(case when ${anticipos.estado} = 'abierto' then ${anticipos.monto} - ${gastado()} else 0 end)`;

/** Con corte: de esa fecha o antes, vigente entonces y aún abierto entonces (sin liquidar o liquidado después). */
const abiertoAlCorte = (corte: string): SQL[] => [
  lte(anticipos.fecha, corte),
  or(isNull(anticipos.fechaDeAnulacion), gt(anticipos.fechaDeAnulacion, corte))!,
  or(inArray(anticipos.estado, ['abierto', 'anulado']), gt(anticipos.fechaDeLiquidacion, corte))!,
];

/** Vencidos: con la fecha límite anterior al corte, o a hoy si el anticipo sigue abierto. */
const vencidos = ({ corte, hoy }: FiltroDeAnticipos): SQL =>
  corte ? lt(anticipos.fechaLimite, corte) : and(eq(anticipos.estado, 'abierto'), lt(anticipos.fechaLimite, hoy))!;

function condiciones(filtro: FiltroDeAnticipos): SQL[] {
  const lista: SQL[] = [];
  if (filtro.corte) lista.push(...abiertoAlCorte(filtro.corte));
  else if (filtro.estado !== 'todos') lista.push(eq(anticipos.estado, filtro.estado));
  if (filtro.beneficiarioId) lista.push(eq(anticipos.beneficiarioId, filtro.beneficiarioId));
  if (filtro.vencidos) lista.push(vencidos(filtro));
  return lista;
}

const columnasDeLaLista = (corte?: string) => ({
  anticipo: anticipos,
  cuentaBancariaId: movimientos.cuentaBancariaId,
  numeroDelDocumento: sql<number>`coalesce(${cheques.numero}, ${movimientos.numero})`.mapWith(Number),
  gastado: sql<string>`${gastado(corte)}::text`,
  total: sql<number>`count(*) over ()`.mapWith(Number),
  totalPorJustificar: sql<string>`coalesce(sum(${porJustificar(corte)}) over (), 0)::text`,
});

/** Los abiertos y los de un corte, por fecha límite (los más atrasados primero); el resto, del más reciente al más viejo. */
const ordenDeLaLista = ({ corte, estado }: FiltroDeAnticipos) =>
  corte || estado === 'abierto' ? ([asc, anticipos.fechaLimite] as const) : ([desc, anticipos.fecha] as const);

interface FilaDeGasto {
  fecha: string;
  resta: boolean;
  monto: string;
  conActivoFijo: boolean;
  documentoDeCompraId: string | null;
}

/** El total gastado y lo de activo fijo (las notas de crédito restan), la última fecha y los documentos del libro. */
function repartirLosGastos(filas: FilaDeGasto[]): RepartoDeLosGastos {
  const con = (signo: (fila: FilaDeGasto) => number) => filas.reduce((suma, fila) => suma + signo(fila), 0);
  const centavos = (fila: FilaDeGasto) => (fila.resta ? -1 : 1) * aCentavos(fila.monto);
  return {
    totalCentavos: con(centavos),
    deActivoCentavos: con((fila) => (fila.conActivoFijo ? centavos(fila) : 0)),
    ultimaFecha: filas.at(-1)?.fecha ?? null,
    documentosDeCompraIds: filas.flatMap(({ documentoDeCompraId }) =>
      documentoDeCompraId ? [documentoDeCompraId] : [],
    ),
  };
}

/** Lecturas de anticipos con seguridad por empresa (RLS). */
export class ConsultasDeAnticiposDrizzle implements ConsultasDeAnticipos {
  async gastadoDe(anticipoId: string): Promise<GastadoDelAnticipo> {
    const [fila] = await transaccionEnCurso()
      .select({
        cantidad: sql<number>`count(*)`.mapWith(Number),
        total: sql<string>`coalesce(sum(case when ${gastos.resta} then -${gastos.monto} else ${gastos.monto} end), 0)::text`,
      })
      .from(gastos)
      .where(and(eq(gastos.anticipoId, anticipoId), eq(gastos.estado, 'vigente')));
    return { cantidad: fila!.cantidad, totalCentavos: aCentavos(fila!.total) };
  }

  async repartoDeLosGastos(anticipoId: string): Promise<RepartoDeLosGastos> {
    const vigentes = and(eq(gastos.anticipoId, anticipoId), eq(gastos.estado, 'vigente'));
    const filas = await transaccionEnCurso()
      .select({
        fecha: gastos.fecha,
        resta: gastos.resta,
        monto: gastos.monto,
        conActivoFijo: gastos.conActivoFijo,
        documentoDeCompraId: gastos.documentoDeCompraId,
      })
      .from(gastos)
      .where(vigentes)
      .orderBy(asc(gastos.fecha));
    return repartirLosGastos(filas);
  }

  async vencidosDe(beneficiarioId: string, hoy: string): Promise<AnticipoVencido[]> {
    return transaccionEnCurso()
      .select({ numero: anticipos.numero, anioDeNumero: anticipos.anioDeNumero })
      .from(anticipos)
      .where(
        and(
          eq(anticipos.beneficiarioId, beneficiarioId),
          eq(anticipos.estado, 'abierto'),
          lt(anticipos.fechaLimite, hoy),
        ),
      )
      .orderBy(asc(anticipos.fecha), asc(anticipos.numero));
  }

  async listar(filtro: FiltroDeAnticipos): Promise<PaginaDeAnticipos> {
    const [hacia, orden] = ordenDeLaLista(filtro);
    const filas = await transaccionEnCurso()
      .select(columnasDeLaLista(filtro.corte))
      .from(anticipos)
      .innerJoin(movimientos, eq(movimientos.id, anticipos.movimientoId))
      .leftJoin(cheques, eq(cheques.movimientoId, movimientos.id))
      .where(and(...condiciones(filtro)))
      .orderBy(hacia(orden), hacia(anticipos.numero))
      .limit(filtro.limite)
      .offset((filtro.pagina - 1) * filtro.limite);
    return {
      total: filas[0]?.total ?? 0,
      totalPorJustificarCentavos: aCentavos(filas[0]?.totalPorJustificar ?? '0'),
      filas: filas.map((fila) => ({
        anticipo: aAnticipo(fila.anticipo),
        cuentaBancariaId: fila.cuentaBancariaId,
        numeroDelDocumento: fila.numeroDelDocumento,
        gastadoCentavos: aCentavos(fila.gastado),
      })),
    };
  }
}
