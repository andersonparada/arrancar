import { and, desc, eq, exists, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import type { DocumentoDto, FiltrosDeDocumentos, RenglonDeDocumentoDto } from '../../aplicacion/dto/documento.dto.js';
import { aCentavosEnteros, deCentavosEnteros } from '../../dominio/decimales.js';
import { articulos } from './articulos.tablas.js';
import { bodegas } from './bodegas.tablas.js';
import { documentos } from './documentos.tablas.js';
import { lotes } from './lotes.tablas.js';
import { movimientos } from './movimientos.tablas.js';
import { unidades } from './unidades.tablas.js';

const LIMITE_DE_LISTA = 500;
const unidadBase = alias(unidades, 'unidad_base');
const unidadEscrita = alias(unidades, 'unidad_escrita');

const sinSigno = (texto: string): string => texto.replace(/^-/, '');

function filtrosDe(filtros: FiltrosDeDocumentos): SQL[] {
  const condiciones: SQL[] = [];
  if (filtros.clase) condiciones.push(eq(documentos.clase, filtros.clase));
  if (filtros.bodegaId) condiciones.push(eq(documentos.bodegaId, filtros.bodegaId));
  if (filtros.estado) condiciones.push(eq(documentos.estado, filtros.estado));
  if (filtros.desde) condiciones.push(gte(documentos.fecha, filtros.desde));
  if (filtros.hasta) condiciones.push(lte(documentos.fecha, filtros.hasta));
  if (filtros.articuloId) {
    const delArticulo = transaccionEnCurso()
      .select({ uno: sql`1` })
      .from(movimientos)
      .where(and(eq(movimientos.documentoId, documentos.id), eq(movimientos.articuloId, filtros.articuloId)));
    condiciones.push(exists(delArticulo));
  }
  return condiciones;
}

const cabeceras = () =>
  transaccionEnCurso()
    .select({ documento: documentos, bodegaNombre: bodegas.nombre, conceptoNombre: conceptosDeGasto.nombre })
    .from(documentos)
    .leftJoin(bodegas, eq(bodegas.id, documentos.bodegaId))
    .leftJoin(conceptosDeGasto, eq(conceptosDeGasto.id, documentos.conceptoDeGastoId));

type Cabecera = Awaited<ReturnType<typeof cabeceras>>[number];

const columnasDeRenglon = {
  documentoId: movimientos.documentoId,
  movimientoId: movimientos.id,
  articuloId: movimientos.articuloId,
  articuloCodigo: articulos.codigo,
  articuloNombre: articulos.nombre,
  loteId: movimientos.loteId,
  loteCodigo: lotes.codigo,
  cantidad: movimientos.cantidad,
  unidadBaseNombre: unidadBase.nombre,
  cantidadEscrita: movimientos.cantidadEscrita,
  unidadEscritaSimbolo: unidadEscrita.simbolo,
  costoUnitario: movimientos.costoUnitario,
  costoTotal: movimientos.costoTotal,
};

/** Los renglones de los documentos, leídos **siempre unidos a su documento** (R-3): la seguridad por bodega los protege. */
const filasDeRenglones = (documentoIds: readonly string[]) =>
  transaccionEnCurso()
    .select(columnasDeRenglon)
    .from(movimientos)
    .innerJoin(documentos, eq(documentos.id, movimientos.documentoId))
    .innerJoin(articulos, eq(articulos.id, movimientos.articuloId))
    .innerJoin(unidadBase, eq(unidadBase.id, articulos.unidadBaseId))
    .leftJoin(unidadEscrita, eq(unidadEscrita.id, movimientos.unidadEscritaId))
    .leftJoin(lotes, eq(lotes.id, movimientos.loteId))
    .where(inArray(movimientos.documentoId, [...documentoIds]))
    .orderBy(movimientos.secuencia);

async function renglonesDe(documentoIds: readonly string[]): Promise<Map<string, RenglonDeDocumentoDto[]>> {
  const porDocumento = new Map<string, RenglonDeDocumentoDto[]>();
  for (const { documentoId, cantidad, costoTotal, ...fila } of await filasDeRenglones(documentoIds)) {
    const lista = porDocumento.get(documentoId) ?? [];
    lista.push({ ...fila, cantidad: sinSigno(cantidad), costoTotal: sinSigno(costoTotal) });
    porDocumento.set(documentoId, lista);
  }
  return porDocumento;
}

type DatosDelDocumento = Omit<
  DocumentoDto,
  'bodegaNombre' | 'conceptoDeGastoNombre' | 'avisos' | 'costoTotal' | 'renglones'
>;

/** Solo lo que la pantalla necesita del documento: nada de la autoría ni de las llaves internas. */
function datosDelDocumento(d: Cabecera['documento']): DatosDelDocumento {
  return {
    id: d.id,
    clase: d.clase,
    numero: d.numero,
    fecha: d.fecha,
    bodegaId: d.bodegaId,
    documentoDeCompraId: d.documentoDeCompraId,
    documentoRelacionadoId: d.documentoRelacionadoId,
    causa: d.causa,
    destino: d.destino,
    conceptoDeGastoId: d.conceptoDeGastoId,
    localidadId: d.localidadId,
    departamentoId: d.departamentoId,
    entregadoA: d.entregadoA,
    soporte: d.soporte,
    observaciones: d.observaciones,
    requiereFactura: d.requiereFactura,
    estado: d.estado,
    motivoDeAnulacion: d.motivoDeAnulacion,
  };
}

function aDocumento(cabecera: Cabecera, renglones: RenglonDeDocumentoDto[]): DocumentoDto {
  const total = renglones.reduce((suma, r) => suma + aCentavosEnteros(r.costoTotal ?? '0'), 0n);
  return {
    ...datosDelDocumento(cabecera.documento),
    bodegaNombre: cabecera.bodegaNombre,
    conceptoDeGastoNombre: cabecera.conceptoNombre,
    avisos: [],
    costoTotal: deCentavosEnteros(total),
    renglones,
  };
}

async function armar(filas: readonly Cabecera[]): Promise<DocumentoDto[]> {
  if (filas.length === 0) return [];
  const renglones = await renglonesDe(filas.map((f) => f.documento.id));
  return filas.map((fila) => aDocumento(fila, renglones.get(fila.documento.id) ?? []));
}

/** Los documentos con sus renglones; la seguridad por bodega de los documentos limita lo que cada usuario ve. */
export class ConsultasDeDocumentosDrizzle {
  async listar(filtros: FiltrosDeDocumentos): Promise<DocumentoDto[]> {
    const filas = await cabeceras()
      .where(and(...filtrosDe(filtros)))
      .orderBy(desc(documentos.fecha), desc(documentos.numero))
      .limit(LIMITE_DE_LISTA);
    return armar(filas);
  }

  async obtener(id: string): Promise<DocumentoDto> {
    const filas = await cabeceras().where(eq(documentos.id, id));
    if (filas.length === 0) throw new RecursoNoEncontrado('El documento');
    return (await armar(filas))[0]!;
  }
}
