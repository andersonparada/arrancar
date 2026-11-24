import { and, desc, eq, exists, gte, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import { alias, type AnyPgColumn } from 'drizzle-orm/pg-core';
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

/** Los filtros que comparan una columna con un valor igual. */
function filtrosDeIgualdad(filtros: FiltrosDeDocumentos): SQL[] {
  const iguales = [
    [documentos.clase, filtros.clase],
    [documentos.bodegaId, filtros.bodegaId],
    [documentos.bodegaDeDestinoId, filtros.bodegaDeDestinoId],
    [documentos.documentoDeCompraId, filtros.documentoDeCompraId],
    [documentos.estado, filtros.estado],
    [documentos.estadoDeTraslado, filtros.estadoDeTraslado],
  ] as const;
  return iguales.filter(([, valor]) => valor).map(([columna, valor]) => eq(columna, valor!));
}

function filtrosDe(filtros: FiltrosDeDocumentos): SQL[] {
  const condiciones: SQL[] = filtrosDeIgualdad(filtros);
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

/** El nombre de una bodega sale de la función de bodegas: quien envía no tiene asignado el destino, ni quien recibe el origen. */
const nombreDe = (bodegaId: AnyPgColumn) =>
  sql<string | null>`(select n.nombre from inventarios.nombres_de_bodegas(array[${bodegaId}]::uuid[]) n)`;

const cabeceras = () =>
  transaccionEnCurso()
    .select({
      documento: documentos,
      bodegaNombre: sql<string | null>`coalesce(${bodegas.nombre}, ${nombreDe(documentos.bodegaId)})`,
      conceptoNombre: conceptosDeGasto.nombre,
      destinoNombre: nombreDe(documentos.bodegaDeDestinoId),
    })
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

/**
 * Los renglones de los documentos, leídos **siempre unidos a su documento** (R-3): la seguridad por bodega los protege.
 * Un documento vigente muestra solo los renglones vigentes (un saldo inicial corregido deja el anterior sin vigencia);
 * uno anulado los muestra todos.
 */
const filasDeRenglones = (documentoIds: readonly string[]) =>
  transaccionEnCurso()
    .select(columnasDeRenglon)
    .from(movimientos)
    .innerJoin(documentos, eq(documentos.id, movimientos.documentoId))
    .innerJoin(articulos, eq(articulos.id, movimientos.articuloId))
    .innerJoin(unidadBase, eq(unidadBase.id, articulos.unidadBaseId))
    .leftJoin(unidadEscrita, eq(unidadEscrita.id, movimientos.unidadEscritaId))
    .leftJoin(lotes, eq(lotes.id, movimientos.loteId))
    .where(
      and(
        inArray(movimientos.documentoId, [...documentoIds]),
        or(eq(movimientos.vigente, true), eq(documentos.estado, 'anulado')),
      ),
    )
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
  'bodegaNombre' | 'conceptoDeGastoNombre' | 'bodegaDeDestinoNombre' | 'avisos' | 'costoTotal' | 'renglones'
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
    bodegaDeDestinoId: d.bodegaDeDestinoId,
    estadoDeTraslado: d.estadoDeTraslado,
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
    bodegaDeDestinoNombre: cabecera.destinoNombre,
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
