import { and, asc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { SaldoInicialDto } from '../../aplicacion/dto/saldo-inicial.dto.js';
import type {
  ConflictosConLaFechaDeInicio,
  ConsultasDeSaldosIniciales,
  LlaveDeRenglon,
  ResumenDeSaldosIniciales,
} from '../../aplicacion/puertos/consultas-de-saldos-iniciales.js';
import { aCentavosEnteros, aDiezmilesimas } from '../../dominio/decimales.js';
import type { TipoDeInventario } from '../../dominio/tipos-de-inventario.js';
import { articulos } from './articulos.tablas.js';
import { bodegas } from './bodegas.tablas.js';
import { documentos } from './documentos.tablas.js';
import { lotes } from './lotes.tablas.js';
import { movimientos } from './movimientos.tablas.js';
import { unidades } from './unidades.tablas.js';

const unidadBase = alias(unidades, 'unidad_base');
const unidadEscrita = alias(unidades, 'unidad_escrita');

const sinSigno = (texto: string): string => texto.replace(/^-/, '');

const columnas = {
  id: movimientos.id,
  documentoId: documentos.id,
  documentoNumero: documentos.numero,
  articuloId: articulos.id,
  articuloCodigo: articulos.codigo,
  articuloNombre: articulos.nombre,
  tipoDeInventario: articulos.tipoDeInventario,
  unidadBaseId: articulos.unidadBaseId,
  bodegaId: bodegas.id,
  bodegaCodigo: bodegas.codigo,
  bodegaNombre: bodegas.nombre,
  loteId: lotes.id,
  loteCodigo: lotes.codigo,
  loteVencimiento: lotes.fechaDeVencimiento,
  cantidadEscrita: movimientos.cantidadEscrita,
  unidadEscritaId: movimientos.unidadEscritaId,
  unidadEscritaNombre: unidadEscrita.nombre,
  cantidadBase: movimientos.cantidad,
  unidadBaseNombre: unidadBase.nombre,
  costoTotal: movimientos.costoTotal,
  costoUnitario: movimientos.costoUnitario,
  fechaDeCapa: movimientos.fechaDeCapa,
  fecha: movimientos.fecha,
};

/** Los renglones vigentes de saldo inicial, unidos a su documento: la seguridad por bodega de los documentos los protege (R-3). */
const renglones = () =>
  transaccionEnCurso()
    .select(columnas)
    .from(movimientos)
    .innerJoin(
      documentos,
      and(
        eq(documentos.id, movimientos.documentoId),
        eq(documentos.clase, 'saldo_inicial'),
        eq(documentos.estado, 'vigente'),
      ),
    )
    .innerJoin(articulos, eq(articulos.id, movimientos.articuloId))
    .innerJoin(bodegas, eq(bodegas.id, movimientos.bodegaId))
    .innerJoin(unidadBase, eq(unidadBase.id, articulos.unidadBaseId))
    .leftJoin(unidadEscrita, eq(unidadEscrita.id, movimientos.unidadEscritaId))
    .leftJoin(lotes, eq(lotes.id, movimientos.loteId));

type Fila = Awaited<ReturnType<typeof renglones>>[number];

function aSaldo(fila: Fila): SaldoInicialDto {
  return {
    id: fila.id,
    documentoId: fila.documentoId,
    documentoNumero: fila.documentoNumero,
    articuloId: fila.articuloId,
    articuloCodigo: fila.articuloCodigo,
    articuloNombre: fila.articuloNombre,
    tipoDeInventario: fila.tipoDeInventario,
    bodegaId: fila.bodegaId,
    bodegaCodigo: fila.bodegaCodigo,
    bodegaNombre: fila.bodegaNombre,
    loteId: fila.loteId,
    loteCodigo: fila.loteCodigo,
    loteVencimiento: fila.loteVencimiento,
    cantidad: fila.cantidadEscrita ?? sinSigno(fila.cantidadBase),
    unidadId: fila.unidadEscritaId ?? fila.unidadBaseId,
    unidadNombre: fila.unidadEscritaNombre ?? fila.unidadBaseNombre,
    cantidadBase: sinSigno(fila.cantidadBase),
    unidadBaseNombre: fila.unidadBaseNombre,
    costoTotal: sinSigno(fila.costoTotal),
    costoUnitario: fila.costoUnitario,
    fechaDeCapa: fila.fechaDeCapa ?? fila.fecha,
  };
}

type FilaDeExistencias = {
  articulo_id: string;
  codigo: string;
  tipo: TipoDeInventario;
  bodega_id: string;
  bodega: string;
  cantidad: string;
  valor: string;
};

/** Un saldo inicial vigente, en las consultas que dan `m` a los movimientos. */
const SOLO_SALDOS = sql.raw('m.fecha_de_capa is not null and m.vigente');

/**
 * Lee los saldos iniciales. Los renglones (`listar`, `obtener`) llevan la seguridad por bodega de sus documentos; el
 * resumen de la revisión y los conflictos de la fecha leen los movimientos sin ese alcance (son de toda la empresa) y
 * reconocen un saldo inicial por su `fecha_de_capa`, que solo ellos llevan.
 */
export class ConsultasDeSaldosInicialesDrizzle implements ConsultasDeSaldosIniciales {
  async listar(): Promise<SaldoInicialDto[]> {
    const filas = await renglones()
      .where(eq(movimientos.vigente, true))
      .orderBy(asc(articulos.codigo), asc(bodegas.codigo), asc(lotes.codigo), asc(movimientos.secuencia));
    return filas.map(aSaldo);
  }

  async obtener(movimientoId: string): Promise<SaldoInicialDto | null> {
    const [fila] = await renglones().where(and(eq(movimientos.id, movimientoId), eq(movimientos.vigente, true)));
    return fila ? aSaldo(fila) : null;
  }

  async existeRenglon(llave: LlaveDeRenglon): Promise<boolean> {
    const { rows } = await transaccionEnCurso().execute(sql`
      select 1 from inventarios.movimientos m
       where ${SOLO_SALDOS} and m.articulo_id = ${llave.articuloId}::uuid and m.bodega_id = ${llave.bodegaId}::uuid
         and m.lote_id is not distinct from ${llave.loteId}::uuid and m.fecha_de_capa = ${llave.fechaDeCapa}::date
       limit 1`);
    return rows.length > 0;
  }

  async resumenParaLaRevision(fechaDeInicio: string): Promise<ResumenDeSaldosIniciales> {
    return { existencias: await this.existencias(), lotesVencidos: await this.lotesVencidos(fechaDeInicio) };
  }

  private async existencias(): Promise<ResumenDeSaldosIniciales['existencias']> {
    const { rows } = await transaccionEnCurso().execute<FilaDeExistencias>(sql`
      select m.articulo_id, a.codigo, a.tipo_de_inventario as tipo, m.bodega_id, b.nombre as bodega,
             sum(m.cantidad)::text as cantidad, sum(m.costo_total)::text as valor
        from inventarios.movimientos m
        join inventarios.articulos a on a.id = m.articulo_id
        join inventarios.nombres_de_bodegas() b on b.id = m.bodega_id
       where ${SOLO_SALDOS}
       group by m.articulo_id, a.codigo, a.tipo_de_inventario, m.bodega_id, b.nombre`);
    return rows.map((fila) => ({
      articuloId: fila.articulo_id,
      articuloCodigo: fila.codigo,
      tipoDeInventario: fila.tipo,
      bodegaId: fila.bodega_id,
      bodegaNombre: fila.bodega,
      cantidad: aDiezmilesimas(fila.cantidad),
      valor: aCentavosEnteros(fila.valor),
    }));
  }

  private async lotesVencidos(fechaDeInicio: string): Promise<ResumenDeSaldosIniciales['lotesVencidos']> {
    const { rows } = await transaccionEnCurso().execute<{ lotes: string; valor: string }>(sql`
      select count(*)::text as lotes, coalesce(sum(t.valor), 0)::text as valor
        from (select m.lote_id, sum(m.cantidad) as cantidad, sum(m.costo_total) as valor
                from inventarios.movimientos m
                join inventarios.lotes l on l.id = m.lote_id
               where ${SOLO_SALDOS} and l.fecha_de_vencimiento < ${fechaDeInicio}::date
               group by m.lote_id) t
       where t.cantidad > 0`);
    return { lotes: Number(rows[0]!.lotes), valor: aCentavosEnteros(rows[0]!.valor) };
  }

  /** Los conteos físicos llegan con INV-9: hasta entonces ningún saldo inicial tiene uno que lo respalde. */
  async hayConteos(): Promise<boolean> {
    return false;
  }

  async conflictosConLaFechaDeInicio(nueva: string): Promise<ConflictosConLaFechaDeInicio> {
    const { rows } = await transaccionEnCurso().execute<{ anteriores: string; capas: string }>(sql`
      select count(*) filter (where m.fecha_de_capa is null and m.vigente and m.fecha < ${nueva}::date)::text as anteriores,
             count(*) filter (where m.fecha_de_capa is not null and m.vigente and m.fecha_de_capa <> m.fecha
                                and m.fecha_de_capa >= ${nueva}::date)::text as capas
        from inventarios.movimientos m`);
    return { movimientosAnteriores: Number(rows[0]!.anteriores), capasPosteriores: Number(rows[0]!.capas) };
  }

  async reubicar(nuevaFechaDeInicio: string): Promise<void> {
    await transaccionEnCurso().execute(sql`select inventarios.reubicar_saldos_iniciales(${nuevaFechaDeInicio}::date)`);
  }
}
