import { and, asc, eq, gte, inArray, lte, not, sql, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import { documentos } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { lineasDeDocumento } from '../../../libro-de-compras/infraestructura/persistencia/lineas-de-documento.tablas.js';
import type { FiltrosDePorRecibir } from '../../aplicacion/dto/por-recibir.dto.js';
import type { ConsultasPorRecibir, FilaPorRecibir } from '../../aplicacion/puertos/consultas-por-recibir.js';
import { aCentavosEnteros } from '../../dominio/decimales.js';
import { articulos } from './articulos.tablas.js';
import { movimientos } from './movimientos.tablas.js';
import { aplicadoSql, costoDeLineaSql, descartadaSql, entraALaBandejaSql } from './sql-de-lineas-de-compra.js';

/** El artículo que se recibió la última vez con ese concepto de gasto y ese proveedor: el que se propone. */
const articuloSugeridoSql = sql<string | null>`(select ${movimientos.articuloId} from ${movimientos}
  join ${lineasDeDocumento} as anterior on anterior.id = ${movimientos.lineaDeDocumentoDeCompraId}
  join ${documentos} as de_la_anterior on de_la_anterior.id = anterior.documento_id
  where ${movimientos.vigente} and ${movimientos.tipo} = 'entrada'
    and anterior.concepto_id = ${lineasDeDocumento.conceptoId}
    and de_la_anterior.proveedor_id = ${documentos.proveedorId}
  order by ${movimientos.fecha} desc, ${movimientos.secuencia} desc limit 1)`;

/** Documento vigente, línea que entra a la bandeja, sin descarte y con algo pendiente, más los filtros. */
function condiciones(filtros: FiltrosDePorRecibir): SQL[] {
  const base = [
    eq(documentos.estado, 'vigente'),
    entraALaBandejaSql,
    not(descartadaSql),
    sql`${costoDeLineaSql} > ${aplicadoSql}`,
  ];
  const opcionales = [
    filtros.desde ? gte(documentos.periodo, filtros.desde) : undefined,
    filtros.hasta ? lte(documentos.periodo, filtros.hasta) : undefined,
    filtros.emitidasHasta ? lte(documentos.fechaEmision, filtros.emitidasHasta) : undefined,
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
  documentoAfectadoId: documentos.documentoAfectadoId,
  serie: documentos.serie,
  numero: documentos.numero,
  fechaEmision: documentos.fechaEmision,
  proveedorNombre: documentos.nombreEmisor,
  conceptoId: conceptosDeGasto.id,
  conceptoNombre: conceptosDeGasto.nombre,
  descripcion: lineasDeDocumento.descripcion,
  costo: costoDeLineaSql,
  recibido: aplicadoSql,
  articuloSugeridoId: articuloSugeridoSql,
  esInventario: lineasDeDocumento.esInventario,
};

/** La bandeja «Por recibir»: lo que el libro marcó como inventario (y las notas de facturas recibidas) y falta aplicar. */
export class ConsultasPorRecibirDrizzle implements ConsultasPorRecibir {
  async listar(filtros: FiltrosDePorRecibir): Promise<FilaPorRecibir[]> {
    const filas = await transaccionEnCurso()
      .select(columnas)
      .from(lineasDeDocumento)
      .innerJoin(documentos, eq(documentos.id, lineasDeDocumento.documentoId))
      .innerJoin(conceptosDeGasto, eq(conceptosDeGasto.id, lineasDeDocumento.conceptoId))
      .where(and(...condiciones(filtros)))
      .orderBy(asc(documentos.fechaEmision), asc(documentos.numero), asc(lineasDeDocumento.numero));
    const sugeridos = await this.articulosSugeridos(filas.map((fila) => fila.articuloSugeridoId));
    return filas.map(({ serie, numero, costo, recibido, ...fila }) => ({
      ...fila,
      documento: serie ? `${serie}-${numero}` : numero,
      costoCentavos: aCentavosEnteros(costo),
      recibidoCentavos: aCentavosEnteros(recibido),
      articuloSugeridoCodigo: sugeridos.get(fila.articuloSugeridoId ?? '')?.codigo ?? null,
      articuloSugeridoNombre: sugeridos.get(fila.articuloSugeridoId ?? '')?.nombre ?? null,
    }));
  }

  private async articulosSugeridos(ids: (string | null)[]): Promise<Map<string, { codigo: string; nombre: string }>> {
    const buscados = [...new Set(ids.filter((id): id is string => id !== null))];
    if (buscados.length === 0) return new Map();
    const filas = await transaccionEnCurso()
      .select({ id: articulos.id, codigo: articulos.codigo, nombre: articulos.nombre })
      .from(articulos)
      .where(inArray(articulos.id, buscados));
    return new Map(filas.map((fila) => [fila.id, { codigo: fila.codigo, nombre: fila.nombre }]));
  }
}
