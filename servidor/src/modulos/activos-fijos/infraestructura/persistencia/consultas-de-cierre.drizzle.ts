import { and, asc, eq, exists, gte, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { datosFiscalesDeEmpresa } from '../../../libro-de-compras/infraestructura/persistencia/datos-fiscales.tablas.js';
import type {
  ConsultasDeCierre,
  HallazgosDeActivos,
  TotalDeClase,
} from '../../aplicacion/puertos/consultas-de-cierre.js';
import type { ActivoParaCerrar } from '../../dominio/depreciacion/cierre-del-mes.js';
import { sumarMeses } from '../../dominio/depreciacion/meses.js';
import type { TramoGuardado } from '../../dominio/depreciacion/tramo.js';
import { acumuladasAntesDe } from './acumulada-al.js';
import { activos } from './activos.tablas.js';
import { bajas } from './bajas.tablas.js';
import { clases } from './clases.tablas.js';
import { cuotas } from './cuotas.tablas.js';
import { hallazgosDeActivos } from './hallazgos-de-activos.drizzle.js';
import { mapeadorDeTramo } from './tramo.mapeador.js';
import { tramos } from './tramos.tablas.js';

/**
 * Lo que la baja vigente del activo congeló como cuota de su propio mes (§5.12, §6.8): hay cuota si el primer mes de la
 * empresa era `mes_siguiente` al dar de baja. Así el cierre sigue lo congelado y no la regla de hoy.
 */
function bajaConCuotaDelMes(): SQL {
  const conCuota = sql`(${bajas.cuotaDelMesContable} > 0 or ${bajas.cuotaDelMesFiscal} > 0)`;
  return exists(
    transaccionEnCurso()
      .select({ uno: sql`1` })
      .from(bajas)
      .where(and(eq(bajas.activoId, activos.id), eq(bajas.estado, 'vigente'), conCuota)),
  );
}

/**
 * Los activos del balance que se depreciaron en el mes: los que están en uso, los que se dieron de baja después de él
 * (todavía estaban en uso) y los dados de baja en el propio mes cuya baja congeló la cuota de ese mes.
 */
function seDeprecianEn(periodo: string): SQL {
  const enUso = eq(activos.estado, 'en_uso');
  const dadoDeBaja = eq(activos.estado, 'dado_de_baja');
  const despues = and(dadoDeBaja, gte(activos.fechaDeBaja, sumarMeses(periodo, 1)));
  const enElMes = and(dadoDeBaja, gte(activos.fechaDeBaja, periodo), bajaConCuotaDelMes());
  return and(eq(activos.tipoDeRegistro, 'activo'), or(enUso, despues, enElMes))!;
}

/** Los tramos vigentes que ya empezaron, agrupados por activo. */
async function tramosPorActivo(periodo: string): Promise<Map<string, TramoGuardado[]>> {
  const filas = await transaccionEnCurso()
    .select()
    .from(tramos)
    .where(and(eq(tramos.vigente, true), lte(tramos.desdePeriodo, periodo)))
    .orderBy(asc(tramos.desdePeriodo));
  const porActivo = new Map<string, TramoGuardado[]>();
  for (const fila of filas)
    porActivo.set(fila.activoId, [
      ...(porActivo.get(fila.activoId) ?? []),
      { ...mapeadorDeTramo.aTramo(fila), id: fila.id },
    ]);
  return porActivo;
}

/** Lo que cada tramo ya depreció con las cuotas vigentes. */
async function depreciadoPorTramo(): Promise<Map<string, number>> {
  const filas = await transaccionEnCurso()
    .select({ tramoId: cuotas.tramoId, suma: sql<string>`sum(${cuotas.monto})` })
    .from(cuotas)
    .where(eq(cuotas.vigente, true))
    .groupBy(cuotas.tramoId);
  return new Map(filas.map((fila) => [fila.tramoId, aCentavos(fila.suma)]));
}

const COLUMNAS_DEL_ACTIVO = {
  activoId: activos.id,
  codigo: activos.codigo,
  claseId: activos.claseId,
  incisoFiscal: clases.incisoFiscal,
  localidadId: activos.localidadId,
  departamentoId: activos.departamentoId,
  ocioso: activos.ocioso,
};

/** Las lecturas del cierre mensual en PostgreSQL; la seguridad por empresa (RLS) limita lo que se ve. */
export class ConsultasDeCierreDrizzle implements ConsultasDeCierre {
  async activosParaCerrar(periodo: string): Promise<ActivoParaCerrar[]> {
    const filas = await transaccionEnCurso()
      .select(COLUMNAS_DEL_ACTIVO)
      .from(activos)
      .innerJoin(clases, eq(clases.id, activos.claseId))
      .where(seDeprecianEn(periodo))
      .orderBy(asc(activos.codigo));
    const [delActivo, depreciados, acumuladas] = [
      await tramosPorActivo(periodo),
      await depreciadoPorTramo(),
      await acumuladasAntesDe(periodo),
    ];
    return filas.map((fila) => ({
      ...fila,
      tramos: delActivo.get(fila.activoId) ?? [],
      depreciadoPorTramo: depreciados,
      acumuladaCentavos: acumuladas.get(fila.activoId) ?? { contable: 0, fiscal: 0 },
    }));
  }

  async primerMesConTramos(): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ periodo: tramos.desdePeriodo })
      .from(tramos)
      .where(eq(tramos.vigente, true))
      .orderBy(asc(tramos.desdePeriodo))
      .limit(1);
    return fila?.periodo ?? null;
  }

  hallazgosDeActivos(periodo: string, mesesDeConstruccion: number): Promise<HallazgosDeActivos> {
    return hallazgosDeActivos(periodo, mesesDeConstruccion);
  }

  async regimenIsr(periodo: string): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ regimenIsr: datosFiscalesDeEmpresa.regimenIsr })
      .from(datosFiscalesDeEmpresa)
      .where(or(isNull(datosFiscalesDeEmpresa.vigenteDesde), lte(datosFiscalesDeEmpresa.vigenteDesde, periodo)))
      .orderBy(sql`${datosFiscalesDeEmpresa.vigenteDesde} desc nulls last`)
      .limit(1);
    return fila?.regimenIsr ?? null;
  }

  async totalesPorClase(periodo: string): Promise<TotalDeClase[]> {
    const filas = await transaccionEnCurso()
      .select({
        claseId: clases.id,
        clase: clases.nombre,
        libro: cuotas.libro,
        suma: sql<string>`sum(${cuotas.monto})`,
      })
      .from(cuotas)
      .innerJoin(activos, eq(activos.id, cuotas.activoId))
      .innerJoin(clases, eq(clases.id, activos.claseId))
      .where(and(eq(cuotas.periodo, periodo), eq(cuotas.vigente, true)))
      .groupBy(clases.id, clases.nombre, cuotas.libro)
      .orderBy(asc(clases.nombre));
    const porClase = new Map<string, TotalDeClase>();
    for (const { claseId, clase, libro, suma } of filas) {
      const total = porClase.get(claseId) ?? { claseId, clase, contableCentavos: 0, fiscalCentavos: 0 };
      if (libro === 'contable') total.contableCentavos = aCentavos(suma);
      else total.fiscalCentavos = aCentavos(suma);
      porClase.set(claseId, total);
    }
    return [...porClase.values()];
  }
}
