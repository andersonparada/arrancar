import { and, asc, eq, gte, inArray, lte, ne, not, sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import { documentos } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { lineasDeDocumento } from '../../../libro-de-compras/infraestructura/persistencia/lineas-de-documento.tablas.js';
import type { FiltrosDeBandeja } from '../../aplicacion/dto/bandeja.dto.js';
import type { ConsultasBandeja, FilaDeBandeja } from '../../aplicacion/puertos/consultas-bandeja.js';
import { activos } from './activos.tablas.js';
import { clasesPorConcepto } from './clases-por-concepto.tablas.js';
import { clases } from './clases.tablas.js';
import { costos } from './costos.tablas.js';
import { capitalizadoSql, costoFirmadoSql, descartadaSql, marcadaParaCapitalizarSql } from './sql-de-lineas.js';

/** El activo con más costo vigente de la factura que corrige una nota: el que se propone para restarle. */
const activoSugeridoSql = sql<string | null>`(select ${costos.activoId} from ${costos}
  where ${costos.documentoDeCompraId} = ${documentos.documentoAfectadoId} and ${costos.estado} = 'vigente'
  group by ${costos.activoId} order by sum(${costos.monto}) desc limit 1)`;

/** Condiciones de la bandeja: documento vigente, línea marcada, sin descarte y con costo pendiente, más los filtros. */
function condiciones(filtros: FiltrosDeBandeja): SQL[] {
  const base = [
    eq(documentos.estado, 'vigente'),
    marcadaParaCapitalizarSql,
    not(descartadaSql),
    sql`${costoFirmadoSql} <> ${capitalizadoSql}`,
  ];
  const opcionales = [
    filtros.desde ? gte(documentos.periodo, filtros.desde) : undefined,
    filtros.hasta ? lte(documentos.periodo, filtros.hasta) : undefined,
    filtros.proveedorId ? eq(documentos.proveedorId, filtros.proveedorId) : undefined,
    filtros.conceptoId ? eq(lineasDeDocumento.conceptoId, filtros.conceptoId) : undefined,
  ];
  return [...base, ...opcionales.filter((condicion): condicion is SQL => condicion !== undefined)];
}

const columnas = {
  lineaId: lineasDeDocumento.id,
  documentoId: documentos.id,
  numeroDeLinea: lineasDeDocumento.numero,
  tipoDeDocumento: documentos.tipo,
  serie: documentos.serie,
  numero: documentos.numero,
  fechaEmision: documentos.fechaEmision,
  proveedorNombre: documentos.nombreEmisor,
  conceptoId: conceptosDeGasto.id,
  conceptoNombre: conceptosDeGasto.nombre,
  descripcion: lineasDeDocumento.descripcion,
  tipoDeLinea: lineasDeDocumento.tipo,
  costo: costoFirmadoSql,
  capitalizado: capitalizadoSql,
  claseSugeridaId: clasesPorConcepto.claseId,
  claseSugeridaNombre: clases.nombre,
  activoSugeridoId: activoSugeridoSql,
};

/** La bandeja «Por capitalizar»: lo que el libro marcó como activo fijo y todavía no se reparte entre activos. */
export class ConsultasBandejaDrizzle implements ConsultasBandeja {
  async listar(filtros: FiltrosDeBandeja): Promise<FilaDeBandeja[]> {
    const filas = await transaccionEnCurso()
      .select(columnas)
      .from(lineasDeDocumento)
      .innerJoin(documentos, eq(documentos.id, lineasDeDocumento.documentoId))
      .innerJoin(conceptosDeGasto, eq(conceptosDeGasto.id, lineasDeDocumento.conceptoId))
      .leftJoin(clasesPorConcepto, eq(clasesPorConcepto.conceptoDeGastoId, lineasDeDocumento.conceptoId))
      .leftJoin(clases, eq(clases.id, clasesPorConcepto.claseId))
      .where(and(...condiciones(filtros)))
      .orderBy(asc(documentos.fechaEmision), asc(documentos.numero), asc(lineasDeDocumento.numero));
    const codigos = await this.codigosDe(filas.map((fila) => fila.activoSugeridoId));
    return filas
      .map(({ serie, numero, costo, capitalizado, ...fila }) => ({
        ...fila,
        documento: serie ? `${serie}-${numero}` : numero,
        costoCentavos: aCentavos(costo),
        capitalizadoCentavos: aCentavos(capitalizado),
        activoSugeridoCodigo: fila.activoSugeridoId ? (codigos.get(fila.activoSugeridoId) ?? null) : null,
      }))
      .filter((fila) => filtros.conPropuesta === undefined || tienePropuesta(fila) === filtros.conPropuesta);
  }

  private async codigosDe(ids: (string | null)[]): Promise<Map<string, string>> {
    const buscados = [...new Set(ids.filter((id): id is string => id !== null))];
    if (buscados.length === 0) return new Map();
    const filas = await transaccionEnCurso()
      .select({ id: activos.id, codigo: activos.codigo })
      .from(activos)
      .where(and(inArray(activos.id, buscados), ne(activos.estado, 'dado_de_baja')));
    return new Map(filas.map((fila) => [fila.id, fila.codigo]));
  }
}

const tienePropuesta = (fila: FilaDeBandeja): boolean =>
  fila.claseSugeridaId !== null || fila.activoSugeridoId !== null;
