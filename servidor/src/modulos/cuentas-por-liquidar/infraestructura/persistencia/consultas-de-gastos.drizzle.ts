import { and, asc, eq, gte, isNotNull, isNull, lt, lte, sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { documentos } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import type {
  ConsultasDeGastos,
  FiltroDeGastos,
  GastoConDocumento,
  PagadoEnElMes,
} from '../../aplicacion/puertos/puertos-de-gastos.js';
import { anticipos } from './anticipos.tablas.js';
import { gastos } from './gastos.tablas.js';
import { aGasto } from './repositorio-de-gastos.drizzle.js';

/** La bandeja (sin anticipo) o los gastos de un anticipo, siempre vigentes, más lo que se filtró. */
function condiciones(filtro: FiltroDeGastos): SQL[] {
  const lista: SQL[] = [eq(gastos.estado, 'vigente')];
  lista.push(filtro.anticipoId === null ? isNull(gastos.anticipoId) : eq(gastos.anticipoId, filtro.anticipoId));
  if (filtro.proveedorId) lista.push(eq(gastos.proveedorId, filtro.proveedorId));
  if (filtro.desde) lista.push(gte(gastos.fecha, filtro.desde));
  if (filtro.hasta) lista.push(lte(gastos.fecha, filtro.hasta));
  if (filtro.conRetencion !== undefined) lista.push(eq(gastos.conRetencion, filtro.conRetencion));
  return lista;
}

/** Lo que cuenta como pagado al proveedor en el mes (§7.2): documentos asignados, vigentes y que no restan. */
const pagadoEnElMes = (proveedorId: string, mes: string): SQL[] => [
  eq(gastos.proveedorId, proveedorId),
  eq(gastos.clase, 'documento'),
  eq(gastos.estado, 'vigente'),
  eq(gastos.resta, false),
  isNotNull(gastos.anticipoId),
  gte(gastos.fecha, mes),
  lt(gastos.fecha, sql`(${mes}::date + interval '1 month')::date`),
];

/** Lecturas de gastos con seguridad por empresa (RLS). */
export class ConsultasDeGastosDrizzle implements ConsultasDeGastos {
  async listar(filtro: FiltroDeGastos): Promise<GastoConDocumento[]> {
    const filas = await transaccionEnCurso()
      .select({ gasto: gastos, documento: documentos })
      .from(gastos)
      .leftJoin(documentos, eq(documentos.id, gastos.documentoDeCompraId))
      .where(and(...condiciones(filtro)))
      .orderBy(asc(gastos.fecha), asc(gastos.creadoEn));
    return filas.map(({ gasto, documento }) => ({
      gasto: aGasto(gasto),
      documento: documento && {
        tipo: documento.tipo,
        serie: documento.serie,
        numero: documento.numero,
        fechaEmision: documento.fechaEmision,
        proveedorNombre: documento.nombreEmisor,
        motivoFueraDelLibro: documento.motivoFueraDelLibro,
      },
    }));
  }

  async pagadoAlProveedorEnElMes(proveedorId: string, mes: string): Promise<PagadoEnElMes> {
    const filas = await transaccionEnCurso()
      .select({
        numero: anticipos.numero,
        anioDeNumero: anticipos.anioDeNumero,
        total: sql<string>`sum(${gastos.monto} + ${gastos.montoRetenido})::text`,
      })
      .from(gastos)
      .innerJoin(anticipos, eq(anticipos.id, gastos.anticipoId))
      .where(and(...pagadoEnElMes(proveedorId, mes)))
      .groupBy(anticipos.numero, anticipos.anioDeNumero)
      .orderBy(asc(anticipos.anioDeNumero), asc(anticipos.numero));
    return {
      totalCentavos: filas.reduce((suma, { total }) => suma + aCentavos(total), 0),
      anticipos: filas.map(({ numero, anioDeNumero }) => ({ numero, anioDeNumero })),
    };
  }
}
