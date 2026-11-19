import { and, asc, eq, sql } from 'drizzle-orm';
import { alias, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { ConsultasDelLibro } from '../../aplicacion/puertos/consultas-del-libro.js';
import type { AnuladoDelLibro, CategoriaDeLinea, DocumentoDelLibro } from '../../dominio/libro/documento-del-libro.js';
import { documentos } from './documentos.tablas.js';
import { facturasAnteriores } from './facturas-anteriores.tablas.js';
import { lineasDeDocumento as lineas } from './lineas-de-documento.tablas.js';
import { anuladoDelLibro, documentosDelLibro } from './libro.mapeador.js';
import { vigenciasDeCombustible as vigencias } from './vigencias-de-combustible.tablas.js';

/**
 * Combustible por su vigencia o por su IDP; si no, activo fijo que es un bien; si no, el tipo de la línea.
 * Un servicio capitalizado sigue en la casilla de servicios del SAT-2237.
 */
const categoriaSql = sql<CategoriaDeLinea>`case
  when ${lineas.vigenciaDeCombustibleId} is not null or ${lineas.idp} > 0 then 'combustible'
  when ${lineas.esActivoFijo} and ${lineas.tipo} = 'bien' then 'activo_fijo'
  else ${lineas.tipo} end`;

/** El NIT del proveedor; en la factura especial, el del vendedor, que se guarda como receptor. */
const nitSql = sql<string | null>`case when ${documentos.tipo} = 'factura_especial'
  then ${documentos.nitReceptor} else ${documentos.nitEmisor} end`;

/** La factura del libro que corrige una nota, para el Excel del libro. */
const afectado = alias(documentos, 'afectado');

/** La factura que corrige una nota: la del libro o, si no, la del sistema anterior. */
const corrige = {
  serie: sql<string | null>`coalesce(${afectado.serie}, ${facturasAnteriores.serie})`,
  numero: sql<string | null>`coalesce(${afectado.numero}, ${facturasAnteriores.numero})`,
  fechaEmision: sql<string | null>`coalesce(${afectado.fechaEmision}, ${facturasAnteriores.fechaEmision})`,
};

/** Lo que se pide por cada documento y categoría de línea: el documento y las líneas sumadas. */
const columnasDeCategoria = {
  documento: documentos,
  nit: nitSql,
  corrige,
  categoria: categoriaSql,
  base: sql<string>`sum(${lineas.base})`,
  iva: sql<string>`sum(${lineas.iva})`,
  ivaNoAcreditable: sql<string>`sum(${lineas.ivaNoAcreditable})`,
  exentoYNoAfecto: sql<string>`sum(${lineas.exento} + ${lineas.otrosImpuestos})`,
  combustibleExento: sql<boolean>`coalesce(bool_or(${vigencias.ivaExento}), false)`,
};

/** Une por la llave de la nota y por la empresa, para usar los índices y no cruzar empresas. */
const alMismoNivel = (id: AnyPgColumn, llave: AnyPgColumn, empresa: AnyPgColumn) =>
  and(eq(id, llave), eq(empresa, documentos.empresaId));

/** Los documentos de la empresa y el período que van en reportes SAT, en el estado dado. */
const delPeriodo = (empresaId: string, periodo: string, estado: 'vigente' | 'anulado') =>
  and(
    eq(documentos.empresaId, empresaId),
    eq(documentos.periodo, periodo),
    eq(documentos.estado, estado),
    eq(documentos.muestraEnReportesSat, true),
  );

/** Las consultas del libro: una por período, con RLS de la empresa y filtro explícito por empresa. */
export class ConsultasDelLibroDrizzle implements ConsultasDelLibro {
  async documentosDelPeriodo(empresaId: string, periodo: string): Promise<DocumentoDelLibro[]> {
    const filas = await transaccionEnCurso()
      .select(columnasDeCategoria)
      .from(documentos)
      .innerJoin(lineas, and(eq(lineas.documentoId, documentos.id), eq(lineas.empresaId, documentos.empresaId)))
      .leftJoin(
        vigencias,
        and(eq(vigencias.id, lineas.vigenciaDeCombustibleId), eq(vigencias.empresaId, lineas.empresaId)),
      )
      .leftJoin(afectado, alMismoNivel(afectado.id, documentos.documentoAfectadoId, afectado.empresaId))
      .leftJoin(
        facturasAnteriores,
        alMismoNivel(facturasAnteriores.id, documentos.facturaAnteriorId, facturasAnteriores.empresaId),
      )
      .where(delPeriodo(empresaId, periodo, 'vigente'))
      .groupBy(documentos.id, afectado.id, facturasAnteriores.id, categoriaSql)
      .orderBy(
        asc(documentos.fechaEmision),
        asc(documentos.tipoDte),
        asc(documentos.serie),
        asc(documentos.numero),
        asc(documentos.id),
      );
    return documentosDelLibro(filas);
  }

  async anuladosDelPeriodo(empresaId: string, periodo: string): Promise<AnuladoDelLibro[]> {
    const filas = await transaccionEnCurso()
      .select({ documento: documentos, nit: nitSql, nombres: usuarios.nombres, apellidos: usuarios.apellidos })
      .from(documentos)
      .leftJoin(usuarios, eq(usuarios.id, documentos.anuladoPor))
      .where(delPeriodo(empresaId, periodo, 'anulado'))
      .orderBy(asc(documentos.fechaEmision), asc(documentos.serie), asc(documentos.numero), asc(documentos.id));
    return filas.map(anuladoDelLibro);
  }
}
