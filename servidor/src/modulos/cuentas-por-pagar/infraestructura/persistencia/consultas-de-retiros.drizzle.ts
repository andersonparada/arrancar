import { and, asc, desc, eq, gt, gte, ilike, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { cheques } from '../../../bancos/infraestructura/persistencia/cheques.tablas.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type {
  ConsultasDeRetiros,
  FiltroDeRetiros,
  PagoDelRetiro,
  PaginaDeRetiros,
  RepartoDelRetiro,
} from '../../aplicacion/puertos/puertos-de-retiros.js';
import { aplicacionesDePagos } from './aplicaciones-de-pagos.tablas.js';
import { documentos } from './documentos.tablas.js';
import { pagos } from './pagos.tablas.js';
import { aRetiro } from './repositorio-de-retiros.drizzle.js';
import { retirosDeEfectivo as retiros } from './retiros-de-efectivo.tablas.js';

/** Los pagos que cuentan: los vigentes de hoy o, con corte, los de esa fecha o antes que seguían vigentes entonces. */
const pagoQueCuenta = (corte?: string): SQL =>
  corte
    ? sql`p.fecha <= ${corte} and (p.fecha_de_anulacion is null or p.fecha_de_anulacion > ${corte})`
    : sql`p.estado = 'vigente'`;

const pagado = (corte?: string): SQL =>
  sql`coalesce((select sum(p.monto) from ${pagos} p where p.retiro_id = ${retiros.id} and ${pagoQueCuenta(corte)}), 0)`;

/** Lo que queda por usar: al corte, el monto menos lo pagado hasta entonces; hoy, también sin lo devuelto ni el faltante. */
const disponible = (corte?: string): SQL =>
  corte
    ? sql`(${retiros.monto} - ${pagado(corte)})`
    : sql`(case when ${retiros.estado} = 'anulado' then 0 else ${retiros.monto} - ${pagado()} - ${retiros.devuelto} - ${retiros.faltante} end)`;

/** Con corte: de esa fecha o antes, vigente entonces y aún abierto entonces (sin liquidar o liquidado después). */
const abiertoAlCorte = (corte: string): SQL[] => [
  lte(retiros.fecha, corte),
  or(isNull(retiros.fechaDeAnulacion), gt(retiros.fechaDeAnulacion, corte))!,
  or(inArray(retiros.estado, ['abierto', 'anulado']), gt(retiros.fechaDeLiquidacion, corte))!,
];

function condiciones(filtro: FiltroDeRetiros): SQL[] {
  const lista: SQL[] = [];
  if (filtro.corte) lista.push(...abiertoAlCorte(filtro.corte));
  else if (filtro.estado !== 'todos') lista.push(eq(retiros.estado, filtro.estado));
  if (filtro.desde) lista.push(gte(retiros.fecha, filtro.desde));
  if (filtro.hasta) lista.push(lte(retiros.fecha, filtro.hasta));
  if (filtro.custodio) lista.push(ilike(retiros.custodio, `%${filtro.custodio}%`));
  if (filtro.soloConDisponible) lista.push(sql`${disponible(filtro.corte)} > 0`);
  return lista;
}

/** Lecturas de retiros con seguridad por empresa (RLS). */
export class ConsultasDeRetirosDrizzle implements ConsultasDeRetiros {
  async pagosDelRetiro(retiroId: string): Promise<PagoDelRetiro[]> {
    const filas = await transaccionEnCurso()
      .select({
        id: pagos.id,
        numero: pagos.numero,
        anioDeNumero: pagos.anioDeNumero,
        proveedorId: proveedores.id,
        proveedorNombre: terceros.nombreMostrar,
        fecha: pagos.fecha,
        monto: pagos.monto,
        estado: pagos.estado,
      })
      .from(pagos)
      .innerJoin(proveedores, eq(proveedores.id, pagos.proveedorId))
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .where(eq(pagos.retiroId, retiroId))
      .orderBy(asc(pagos.anioDeNumero), asc(pagos.numero));
    return filas.map(({ proveedorId, proveedorNombre, monto, ...pago }) => ({
      ...pago,
      proveedor: { id: proveedorId, nombre: proveedorNombre },
      montoCentavos: aCentavos(monto),
    }));
  }

  async repartoDelRetiro(retiroId: string): Promise<RepartoDelRetiro> {
    const [fila] = await transaccionEnCurso()
      .select({
        total: sql<string>`coalesce(sum(${aplicacionesDePagos.monto}), 0)::text`,
        deActivo: sql<string>`coalesce(sum(${aplicacionesDePagos.monto}) filter (where ${documentos.tieneActivoFijo}), 0)::text`,
      })
      .from(aplicacionesDePagos)
      .innerJoin(pagos, eq(pagos.id, aplicacionesDePagos.pagoId))
      .innerJoin(documentos, eq(documentos.id, aplicacionesDePagos.cargoId))
      .where(and(eq(pagos.retiroId, retiroId), eq(pagos.estado, 'vigente'), eq(aplicacionesDePagos.vigente, true)));
    return { totalCentavos: aCentavos(fila!.total), deActivoCentavos: aCentavos(fila!.deActivo) };
  }

  async listar(filtro: FiltroDeRetiros): Promise<PaginaDeRetiros> {
    const hacia = filtro.corte || filtro.estado === 'abierto' ? asc : desc;
    const filas = await transaccionEnCurso()
      .select(columnasDeLaLista(filtro.corte))
      .from(retiros)
      .innerJoin(movimientos, eq(movimientos.id, retiros.movimientoId))
      .leftJoin(cheques, eq(cheques.movimientoId, movimientos.id))
      .where(and(...condiciones(filtro)))
      .orderBy(hacia(retiros.fecha), hacia(retiros.numero))
      .limit(filtro.limite)
      .offset((filtro.pagina - 1) * filtro.limite);
    return {
      total: filas[0]?.total ?? 0,
      totalDisponibleCentavos: aCentavos(filas[0]?.totalDisponible ?? '0'),
      filas: filas.map((fila) => ({
        retiro: aRetiro(fila.retiro),
        cuentaBancariaId: fila.cuentaBancariaId,
        numeroDelDocumento: fila.numeroDelDocumento,
        pagadoCentavos: aCentavos(fila.pagado),
        disponibleCentavos: aCentavos(fila.disponible),
      })),
    };
  }
}

const columnasDeLaLista = (corte?: string) => ({
  retiro: retiros,
  cuentaBancariaId: movimientos.cuentaBancariaId,
  numeroDelDocumento: sql<number>`coalesce(${cheques.numero}, ${movimientos.numero})`.mapWith(Number),
  pagado: sql<string>`${pagado(corte)}::text`,
  disponible: sql<string>`${disponible(corte)}::text`,
  total: sql<number>`count(*) over ()`.mapWith(Number),
  totalDisponible: sql<string>`coalesce(sum(${disponible(corte)}) over (), 0)::text`,
});
