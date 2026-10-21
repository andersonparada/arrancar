import { and, eq, gte, inArray, isNotNull, lt, or, sql, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ConsultasDeConciliacion } from '../../aplicacion/puertos/consultas-de-conciliacion.js';
import type { RangoDeLote } from '../../dominio/conciliacion/cobertura-de-la-sat.js';
import type { DocumentoConciliable, FilaConciliable } from '../../dominio/conciliacion/tipos-de-conciliacion.js';
import { sumarMeses } from '../../dominio/periodo-del-libro.js';
import { documentos } from './documentos.tablas.js';
import { dteRecibidos } from './dte-recibidos.tablas.js';
import { lotesDeDte } from './lotes-de-dte.tablas.js';

/** Los documentos vigentes que van en el libro de ese período. */
const delLibroDelPeriodo = (periodo: string): SQL | undefined =>
  and(eq(documentos.estado, 'vigente'), eq(documentos.periodo, periodo), eq(documentos.muestraEnReportesSat, true));

/** Las filas emitidas dentro del mes del período. */
const emitidasEnElMes = (periodo: string): SQL | undefined =>
  and(gte(dteRecibidos.fechaEmision, periodo), lt(dteRecibidos.fechaEmision, sumarMeses(periodo, 1)));

/** Las dos llaves de cruce de un documento vigente con la bandeja: su autorización, o NIT, serie y número. */
const cruzaConLasFilasDelMes = (periodo: string): SQL | undefined => {
  const autorizaciones = transaccionEnCurso()
    .select({ valor: dteRecibidos.autorizacionFel })
    .from(dteRecibidos)
    .where(emitidasEnElMes(periodo));
  const numeros = transaccionEnCurso()
    .select({ nit: dteRecibidos.nitEmisor, serie: dteRecibidos.serie, numero: dteRecibidos.numero })
    .from(dteRecibidos)
    .where(emitidasEnElMes(periodo));
  return and(
    eq(documentos.estado, 'vigente'),
    or(
      inArray(documentos.autorizacionFel, autorizaciones),
      sql`(${documentos.nitEmisor}, ${documentos.serie}, ${documentos.numero}) in ${numeros}`,
    ),
  );
};

/** Las filas que cruzan con algún documento del libro del período. */
const cruzaConElLibro = (periodo: string): SQL | undefined => {
  const autorizaciones = transaccionEnCurso()
    .select({ valor: documentos.autorizacionFel })
    .from(documentos)
    .where(and(delLibroDelPeriodo(periodo), isNotNull(documentos.autorizacionFel)));
  const numeros = transaccionEnCurso()
    .select({ nit: documentos.nitEmisor, serie: documentos.serie, numero: documentos.numero })
    .from(documentos)
    .where(delLibroDelPeriodo(periodo));
  return or(
    inArray(dteRecibidos.autorizacionFel, autorizaciones),
    sql`(${dteRecibidos.nitEmisor}, ${dteRecibidos.serie}, ${dteRecibidos.numero}) in ${numeros}`,
  );
};

type FilaDeDocumento = typeof documentos.$inferSelect;
type FilaDeDte = typeof dteRecibidos.$inferSelect;

function documentoConciliable(fila: FilaDeDocumento): DocumentoConciliable {
  return {
    id: fila.id,
    tipoDte: fila.tipoDte,
    autorizacionFel: fila.autorizacionFel,
    nitEmisor: fila.nitEmisor,
    nombreEmisor: fila.nombreEmisor,
    serie: fila.serie,
    numero: fila.numero,
    fechaEmision: fila.fechaEmision,
    periodo: fila.periodo,
    fueraDelLibro: !fila.muestraEnReportesSat,
    total: fila.total,
    iva: fila.iva,
    idp: fila.idp,
    otrosImpuestos: fila.otrosImpuestos,
  };
}

function filaConciliable(fila: FilaDeDte): FilaConciliable {
  const { id, autorizacionFel, tipoDte, serie, numero, fechaEmision, nitEmisor, nombreEmisor } = fila;
  const { total, iva, idp, otrosImpuestos, estadoSat, estado, motivoDeBloqueo, motivoDeDescarte } = fila;
  return {
    ...{ id, autorizacionFel, tipoDte, serie, numero, fechaEmision, nitEmisor, nombreEmisor },
    ...{ total, iva, idp, otrosImpuestos, estadoSat, estado, motivoDeBloqueo, motivoDeDescarte },
  };
}

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class ConsultasDeConciliacionDrizzle implements ConsultasDeConciliacion {
  async documentos(periodo: string): Promise<DocumentoConciliable[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(documentos)
      .where(or(delLibroDelPeriodo(periodo), cruzaConLasFilasDelMes(periodo)));
    return filas.map(documentoConciliable);
  }

  async filas(periodo: string): Promise<FilaConciliable[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(dteRecibidos)
      .where(or(emitidasEnElMes(periodo), cruzaConElLibro(periodo)));
    return filas.map(filaConciliable);
  }

  async rangosDeLotes(): Promise<RangoDeLote[]> {
    const lotes = await transaccionEnCurso()
      .select({ desde: lotesDeDte.emisionDesde, hasta: lotesDeDte.emisionHasta })
      .from(lotesDeDte)
      .where(and(eq(lotesDeDte.proposito, 'bandeja'), isNotNull(lotesDeDte.emisionDesde)));
    return lotes.flatMap(({ desde, hasta }) => (desde && hasta ? [{ desde, hasta }] : []));
  }
}
