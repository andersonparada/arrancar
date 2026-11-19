import { and, asc, eq, lt, sql, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { documentos } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import type { HallazgosDeActivos } from '../../aplicacion/puertos/consultas-de-cierre.js';
import type { GrupoDeActivos } from '../../dominio/depreciacion/hallazgos-del-cierre.js';
import { sumarMeses } from '../../dominio/depreciacion/meses.js';
import { activos } from './activos.tablas.js';
import { clases } from './clases.tablas.js';
import { costos } from './costos.tablas.js';

/** Cuántos códigos se muestran de cada hallazgo: con el total, alcanza para ir a buscar el resto. */
const CODIGOS_MOSTRADOS = 20;

async function grupoDe(condicion: SQL): Promise<GrupoDeActivos> {
  const transaccion = transaccionEnCurso();
  const [conteo] = await transaccion
    .select({ cantidad: sql<number>`count(*)::int` })
    .from(activos)
    .where(condicion);
  const filas = await transaccion
    .select({ codigo: activos.codigo })
    .from(activos)
    .where(condicion)
    .orderBy(asc(activos.codigo))
    .limit(CODIGOS_MOSTRADOS);
  return { cantidad: conteo?.cantidad ?? 0, codigos: filas.map((fila) => fila.codigo) };
}

const delBalance = eq(activos.tipoDeRegistro, 'activo');

const esEdificio = sql`exists (select 1 from ${clases} where ${clases.id} = ${activos.claseId} and ${clases.incisoFiscal} = 'edificios')`;

/** Costos vigentes cuyo documento del libro ya se anuló (anular el documento con el módulo inactivo lo permite, R-1). */
const conCostosDeAnulados = sql`exists (select 1 from ${costos} where ${costos.activoId} = ${activos.id}
  and ${costos.estado} = 'vigente' and ${costos.documentoDeCompraId} in
  (select ${documentos.id} from ${documentos} where ${documentos.estado} = 'anulado'))`;

async function hayActivosDeSaldoInicial(): Promise<boolean> {
  const [fila] = await transaccionEnCurso()
    .select({ id: activos.id })
    .from(activos)
    .where(eq(activos.origen, 'saldo_inicial'))
    .limit(1);
  return fila !== undefined;
}

/** Lo que la base sabe de los activos que el cierre convierte en hallazgos (§6.9). */
export async function hallazgosDeActivos(periodo: string, mesesDeConstruccion: number): Promise<HallazgosDeActivos> {
  const obraAntiguaAntesDe = sumarMeses(periodo, 1 - mesesDeConstruccion);
  return {
    enConstruccionAntiguos: await grupoDe(
      and(delBalance, eq(activos.estado, 'en_construccion'), lt(activos.fechaDeAdquisicion, obraAntiguaAntesDe))!,
    ),
    enUsoSinLocalidad: await grupoDe(
      and(delBalance, eq(activos.estado, 'en_uso'), sql`${activos.localidadId} is null`)!,
    ),
    edificiosSinValores: await grupoDe(
      and(
        delBalance,
        eq(activos.estado, 'en_uso'),
        esEdificio,
        sql`${activos.valorDeMatricula} is null and ${activos.valorCatastral} is null`,
      )!,
    ),
    conCostosDeDocumentosAnulados: await grupoDe(conCostosDeAnulados),
    conSaldoInicial: await hayActivosDeSaldoInicial(),
  };
}
