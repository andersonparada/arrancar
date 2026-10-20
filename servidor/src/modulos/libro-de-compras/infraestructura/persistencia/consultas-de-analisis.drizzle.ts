import { and, asc, eq, gte, lte, ne, sql, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ConsultasDeAnalisis } from '../../aplicacion/puertos/consultas-de-analisis.js';
import type {
  ActivoFijoComprado,
  CombustibleDelMes,
  CompraDeConcepto,
  CompraDeProveedor,
  IvaAlCostoDeLinea,
} from '../../dominio/analisis/filas-del-analisis.js';
import type { RangoDePeriodos } from '../../dominio/analisis/rango-de-periodos.js';
import {
  activoFijoComprado,
  combustibleDelMes,
  compraDeConcepto,
  compraDeProveedor,
  ivaAlCostoDeLinea,
} from './analisis.mapeador.js';
import { combustibles } from './combustibles.tablas.js';
import { conceptosDeGasto as conceptos } from './conceptos-de-gasto.tablas.js';
import { documentos } from './documentos.tablas.js';
import { lineasDeDocumento as lineas } from './lineas-de-documento.tablas.js';
import { retenciones } from './retenciones.tablas.js';
import { vigenciasDeCombustible as vigencias } from './vigencias-de-combustible.tablas.js';

/** Las notas de crédito restan; las demás suman (la de débito se guarda positiva y suma). */
const signo = sql`case when ${documentos.tipo} = 'nota_de_credito' then -1 else 1 end`;

/** La suma con signo de una expresión de dinero, o cero si no hay filas. */
const sumaConSigno = (expresion: SQL | SQL.Aliased | object) =>
  sql<string>`coalesce(sum((${expresion}) * ${signo}), 0)`;

const nitSql = sql<string | null>`case when ${documentos.tipo} = 'factura_especial'
  then ${documentos.nitReceptor} else ${documentos.nitEmisor} end`;

/** Los documentos vigentes de la empresa dentro del rango; salvo que se pida lo contrario, solo los del libro. */
function documentosDelRango(empresaId: string, rango: RangoDePeriodos, soloDelLibro = true): SQL | undefined {
  return and(
    eq(documentos.empresaId, empresaId),
    eq(documentos.estado, 'vigente'),
    gte(documentos.periodo, rango.desde),
    lte(documentos.periodo, rango.hasta),
    soloDelLibro ? eq(documentos.muestraEnReportesSat, true) : undefined,
  );
}

/** Lo retenido al documento (todas sus retenciones practicadas), sin join para no repetir filas. */
const retenidoDelDocumento = sql`coalesce((select sum(${retenciones.monto}) from ${retenciones}
  where ${retenciones.documentoId} = ${documentos.id} and ${retenciones.empresaId} = ${documentos.empresaId}), 0)`;

/** El más reciente de los valores de un proveedor, por si cambió de nombre o de NIT. */
const elMasReciente = <T>(expresion: SQL) =>
  sql<T>`(array_agg(${expresion} order by ${documentos.fechaEmision} desc, ${documentos.creadoEn} desc))[1]`;

const creditoDeLinea = sql`${lineas.iva} - ${lineas.ivaNoAcreditable}`;
const costoDeLinea = sql`${lineas.total} - ${lineas.iva} + ${lineas.ivaNoAcreditable}`;

const columnasDeLinea = {
  documentoId: documentos.id,
  periodo: documentos.periodo,
  fecha: documentos.fechaEmision,
  tipoDte: documentos.tipoDte,
  serie: documentos.serie,
  numero: documentos.numero,
  nit: nitSql,
  proveedor: documentos.nombreEmisor,
  motivo: documentos.motivoSinCredito,
  numeroDeLinea: lineas.numero,
  concepto: conceptos.nombre,
  descripcion: lineas.descripcion,
  ivaAlCosto: sql<string>`${lineas.ivaNoAcreditable} * ${signo}`,
  costo: sql<string>`(${costoDeLinea}) * ${signo}`,
  ivaConCredito: sql<string>`(${creditoDeLinea}) * ${signo}`,
};

/** Las líneas de documentos del rango que cumplen la condición, con su documento y concepto. */
function lineasDelRango(empresaId: string, rango: RangoDePeriodos, condicion: SQL) {
  return transaccionEnCurso()
    .select(columnasDeLinea)
    .from(lineas)
    .innerJoin(documentos, and(eq(documentos.id, lineas.documentoId), eq(documentos.empresaId, lineas.empresaId)))
    .innerJoin(conceptos, and(eq(conceptos.id, lineas.conceptoId), eq(conceptos.empresaId, lineas.empresaId)))
    .where(and(documentosDelRango(empresaId, rango), condicion));
}

/** Lo que se suma por combustible y mes. */
const columnasDeCombustible = {
  combustible: combustibles.nombre,
  periodo: documentos.periodo,
  galones: sql<string>`coalesce(round(sum(${lineas.galones} * 1000 * ${signo})), 0)::bigint`,
  idp: sumaConSigno(lineas.idp),
  base: sumaConSigno(lineas.base),
  iva: sumaConSigno(lineas.iva),
  exentoYNoAfecto: sumaConSigno(sql`${lineas.exento} + ${lineas.otrosImpuestos}`),
  exentoPorDecreto: sql<boolean>`coalesce(bool_or(${vigencias.ivaExento}), false)`,
  lineasConIdpSinGalones: sql<number>`count(*) filter (where ${lineas.idpEscrito} and ${lineas.galones} is null)::int`,
};

/** Los análisis de compras en SQL: agregan en la base y devuelven el dinero como texto. */
export class ConsultasDeAnalisisDrizzle implements ConsultasDeAnalisis {
  async comprasPorProveedor(
    empresaId: string,
    rango: RangoDePeriodos,
    opciones: { incluirFueraDelLibro: boolean },
  ): Promise<CompraDeProveedor[]> {
    const filas = await transaccionEnCurso()
      .select({
        proveedorId: documentos.proveedorId,
        nit: elMasReciente<string | null>(nitSql),
        nombre: elMasReciente<string>(sql`${documentos.nombreEmisor}`),
        documentos: sql<number>`count(*)::int`,
        total: sumaConSigno(documentos.total),
        base: sumaConSigno(documentos.base),
        ivaConCredito: sumaConSigno(sql`${documentos.iva} - ${documentos.ivaNoAcreditable}`),
        ivaSinCredito: sumaConSigno(documentos.ivaNoAcreditable),
        exentoYNoAfecto: sumaConSigno(sql`${documentos.exento} + ${documentos.otrosImpuestos}`),
        idp: sumaConSigno(documentos.idp),
        retenido: sumaConSigno(retenidoDelDocumento),
      })
      .from(documentos)
      .where(documentosDelRango(empresaId, rango, !opciones.incluirFueraDelLibro))
      .groupBy(documentos.proveedorId);
    return filas.map(compraDeProveedor).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  async comprasPorConcepto(empresaId: string, rango: RangoDePeriodos): Promise<CompraDeConcepto[]> {
    const filas = await transaccionEnCurso()
      .select({
        conceptoId: conceptos.id,
        concepto: conceptos.nombre,
        tipo: lineas.tipo,
        lineas: sql<number>`count(*)::int`,
        base: sumaConSigno(lineas.base),
        ivaConCredito: sumaConSigno(creditoDeLinea),
        ivaAlCosto: sumaConSigno(lineas.ivaNoAcreditable),
        costo: sumaConSigno(costoDeLinea),
      })
      .from(lineas)
      .innerJoin(documentos, and(eq(documentos.id, lineas.documentoId), eq(documentos.empresaId, lineas.empresaId)))
      .innerJoin(conceptos, and(eq(conceptos.id, lineas.conceptoId), eq(conceptos.empresaId, lineas.empresaId)))
      .where(documentosDelRango(empresaId, rango))
      .groupBy(conceptos.id, conceptos.nombre, lineas.tipo)
      .orderBy(asc(conceptos.nombre), asc(lineas.tipo));
    return filas.map(compraDeConcepto);
  }

  async ivaAlCosto(empresaId: string, rango: RangoDePeriodos): Promise<IvaAlCostoDeLinea[]> {
    const filas = await lineasDelRango(empresaId, rango, ne(lineas.ivaNoAcreditable, '0')).orderBy(
      asc(documentos.motivoSinCredito),
      asc(documentos.periodo),
      asc(documentos.fechaEmision),
      asc(documentos.serie),
      asc(documentos.numero),
      asc(lineas.numero),
    );
    return filas.map(ivaAlCostoDeLinea);
  }

  async activosFijos(empresaId: string, rango: RangoDePeriodos): Promise<ActivoFijoComprado[]> {
    const filas = await lineasDelRango(empresaId, rango, eq(lineas.esActivoFijo, true)).orderBy(
      asc(documentos.fechaEmision),
      asc(documentos.serie),
      asc(documentos.numero),
      asc(lineas.numero),
    );
    return filas.map(activoFijoComprado);
  }

  async combustibles(empresaId: string, rango: RangoDePeriodos): Promise<CombustibleDelMes[]> {
    const filas = await transaccionEnCurso()
      .select(columnasDeCombustible)
      .from(lineas)
      .innerJoin(documentos, and(eq(documentos.id, lineas.documentoId), eq(documentos.empresaId, lineas.empresaId)))
      .leftJoin(
        vigencias,
        and(eq(vigencias.id, lineas.vigenciaDeCombustibleId), eq(vigencias.empresaId, lineas.empresaId)),
      )
      .leftJoin(
        combustibles,
        and(eq(combustibles.id, vigencias.combustibleId), eq(combustibles.empresaId, vigencias.empresaId)),
      )
      .where(
        and(
          documentosDelRango(empresaId, rango),
          sql`(${lineas.vigenciaDeCombustibleId} is not null or ${lineas.idp} > 0)`,
        ),
      )
      .groupBy(combustibles.nombre, documentos.periodo)
      .orderBy(asc(combustibles.nombre), asc(documentos.periodo));
    return filas.map(combustibleDelMes);
  }
}
