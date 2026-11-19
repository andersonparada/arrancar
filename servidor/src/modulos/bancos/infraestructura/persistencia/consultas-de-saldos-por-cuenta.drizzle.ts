import { and, asc, eq, isNull, lte, sql } from 'drizzle-orm';
import { exigirQueExista } from '../../../core/compartido/infraestructura/exigir-que-exista.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { CategoriaEnTransito, PartidaEnTransitoDto } from '../../aplicacion/dto/saldos-por-cuenta.dto.js';
import type {
  ConsultasDeSaldosPorCuenta,
  FiltroDeLectura,
  LecturaDeCuenta,
  LecturaDeSaldos,
  SumaEnTransito,
} from '../../aplicacion/puertos/consultas-de-saldos-por-cuenta.js';
import { bancos } from './bancos.tablas.js';
import { cheques } from './cheques.tablas.js';
import { conciliaciones } from './conciliaciones.tablas.js';
import { categoriaEnTransito, efectoEnLibros, enTransitoA } from './condiciones-en-transito.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { movimientos } from './movimientos.tablas.js';

const dosDecimales = (expresion: ReturnType<typeof sql>) =>
  sql<string>`(coalesce(${expresion}, 0))::numeric(14,2)::text`;

const deLaCuenta = (cuentaBancariaId: string | undefined) =>
  cuentaBancariaId ? eq(movimientos.cuentaBancariaId, cuentaBancariaId) : undefined;

type DatosDeLaCuenta = Omit<LecturaDeCuenta, 'libros' | 'posfechados' | 'movimientosAnteriores' | 'ultimaConciliacion'>;
type Libros = Map<string, Pick<LecturaDeCuenta, 'libros' | 'posfechados' | 'movimientosAnteriores'>>;

/** Junta lo de la cuenta con sus libros y su última conciliación (cero y ninguna si no tiene movimientos ni conciliaciones). */
const unirCuenta = (
  cuenta: DatosDeLaCuenta,
  libros: Libros,
  ultimas: Map<string, { anio: number; mes: number }>,
): LecturaDeCuenta => ({
  ...cuenta,
  libros: libros.get(cuenta.cuentaBancariaId)?.libros ?? '0.00',
  posfechados: libros.get(cuenta.cuentaBancariaId)?.posfechados ?? '0.00',
  movimientosAnteriores: libros.get(cuenta.cuentaBancariaId)?.movimientosAnteriores ?? 0,
  ultimaConciliacion: ultimas.get(cuenta.cuentaBancariaId) ?? null,
});

/**
 * Lecturas agregadas de «Saldos por cuenta»: una consulta por tema (cuentas, libros y posfechados, última conciliación,
 * sumas en tránsito y detalle de las partidas), todas con los índices de la cuenta y la fecha; no recorren los
 * movimientos ya conciliados uno por uno.
 */
export class ConsultasDeSaldosPorCuentaDrizzle implements ConsultasDeSaldosPorCuenta {
  async leer(filtro: FiltroDeLectura): Promise<LecturaDeSaldos> {
    if (filtro.cuentaBancariaId) await exigirQueExista(cuentasBancarias, filtro.cuentaBancariaId, 'La cuenta bancaria');
    const cuentas = await this.cuentas(filtro);
    const libros = await this.librosYPosfechados(filtro);
    const ultimas = await this.ultimasConciliaciones(filtro);
    return {
      cuentas: cuentas.map((cuenta) => unirCuenta(cuenta, libros, ultimas)),
      sumas: await this.sumasEnTransito(filtro),
      partidas: await this.partidasEnTransito(filtro),
    };
  }

  private async cuentas({ cuentaBancariaId }: FiltroDeLectura) {
    const filas = await transaccionEnCurso()
      .select({
        cuentaBancariaId: cuentasBancarias.id,
        nombre: cuentasBancarias.nombre,
        numero: cuentasBancarias.numero,
        activo: cuentasBancarias.activo,
        bancoNombre: bancos.nombre,
      })
      .from(cuentasBancarias)
      .leftJoin(bancos, eq(bancos.id, cuentasBancarias.bancoId))
      .where(cuentaBancariaId ? eq(cuentasBancarias.id, cuentaBancariaId) : undefined)
      .orderBy(asc(cuentasBancarias.nombre));
    return filas satisfies DatosDeLaCuenta[];
  }

  /**
   * Libros hasta el corte, cheques posfechados vigentes y cuántos movimientos del día a día (no los de la carga inicial,
   * que entran en la primera conciliación) hay hasta el fin del mes anterior.
   */
  private async librosYPosfechados({ fecha, finDelMesAnterior, cuentaBancariaId }: FiltroDeLectura) {
    const filas = await transaccionEnCurso()
      .select({
        cuentaBancariaId: movimientos.cuentaBancariaId,
        libros: dosDecimales(sql`sum(${efectoEnLibros}) filter (where ${lte(movimientos.fecha, fecha)})`),
        posfechados: dosDecimales(
          sql`sum(${movimientos.monto}) filter (where ${movimientos.tipo} = 'cheque' and ${movimientos.fecha} > ${fecha} and ${movimientos.revertidoEn} is null)`,
        ),
        movimientosAnteriores: sql<number>`(count(*) filter (where ${lte(movimientos.fecha, finDelMesAnterior)} and ${movimientos.saldoInicial} = false))::int`,
      })
      .from(movimientos)
      .where(and(isNull(movimientos.anuladoEn), deLaCuenta(cuentaBancariaId)))
      .groupBy(movimientos.cuentaBancariaId);
    return new Map(filas.map((fila) => [fila.cuentaBancariaId, fila]));
  }

  /** La conciliación autorizada más reciente de cada cuenta cuyo mes empieza hasta el corte. */
  private async ultimasConciliaciones({ fecha, cuentaBancariaId }: FiltroDeLectura) {
    const filas = await transaccionEnCurso()
      .selectDistinctOn([conciliaciones.cuentaBancariaId], {
        cuentaBancariaId: conciliaciones.cuentaBancariaId,
        anio: conciliaciones.anio,
        mes: conciliaciones.mes,
      })
      .from(conciliaciones)
      .where(
        and(
          eq(conciliaciones.estado, 'autorizada'),
          sql`make_date(${conciliaciones.anio}, ${conciliaciones.mes}, 1) <= ${fecha}::date`,
          cuentaBancariaId ? eq(conciliaciones.cuentaBancariaId, cuentaBancariaId) : undefined,
        ),
      )
      .orderBy(conciliaciones.cuentaBancariaId, sql`${conciliaciones.anio} desc`, sql`${conciliaciones.mes} desc`);
    return new Map(filas.map(({ cuentaBancariaId: id, anio, mes }) => [id, { anio, mes }]));
  }

  private async sumasEnTransito({ fecha, cuentaBancariaId }: FiltroDeLectura): Promise<SumaEnTransito[]> {
    const filas = await transaccionEnCurso()
      .select({
        cuentaBancariaId: movimientos.cuentaBancariaId,
        categoria: categoriaEnTransito,
        cantidad: sql<number>`count(*)::int`,
        efecto: dosDecimales(sql`sum(${efectoEnLibros})`),
      })
      .from(movimientos)
      .where(and(enTransitoA(fecha), deLaCuenta(cuentaBancariaId)))
      .groupBy(movimientos.cuentaBancariaId, categoriaEnTransito);
    return filas.map((fila) => ({ ...fila, categoria: fila.categoria as CategoriaEnTransito }));
  }

  private async partidasEnTransito({ fecha, cuentaBancariaId }: FiltroDeLectura): Promise<PartidaEnTransitoDto[]> {
    const filas = await transaccionEnCurso()
      .select({
        movimientoId: movimientos.id,
        cuentaBancariaId: movimientos.cuentaBancariaId,
        categoria: categoriaEnTransito,
        tipo: movimientos.tipo,
        fecha: movimientos.fecha,
        monto: sql<string>`(${movimientos.monto})::text`,
        numeroDeCheque: cheques.numero,
        referencia: movimientos.referencia,
        beneficiario: movimientos.beneficiario,
        parteDeApertura: movimientos.parteDeApertura,
      })
      .from(movimientos)
      .leftJoin(cheques, eq(cheques.movimientoId, movimientos.id))
      .where(and(enTransitoA(fecha), deLaCuenta(cuentaBancariaId)))
      .orderBy(asc(movimientos.fecha), asc(movimientos.creadoEn));
    return filas.map((fila) => ({ ...fila, categoria: fila.categoria as CategoriaEnTransito }));
  }
}
