import { and, asc, eq, gt, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ExistenciaDto, FiltrosDeExistencias } from '../../aplicacion/dto/existencia.dto.js';
import type { ArticuloDeKardex, FilaDeKardex } from '../../aplicacion/puertos/consultas-del-kardex.js';
import { valorDe } from '../../dominio/costeo/escalas.js';
import {
  aCentavosEnteros,
  aDiezmilesimas,
  aMillonesimas,
  deCentavosEnteros,
  deMillonesimas,
} from '../../dominio/decimales.js';
import { articulos } from './articulos.tablas.js';
import { bodegas } from './bodegas.tablas.js';
import { documentos } from './documentos.tablas.js';
import { existencias } from './existencias.tablas.js';
import { lotes } from './lotes.tablas.js';
import { movimientos } from './movimientos.tablas.js';
import { saldosDeArticulos } from './saldos-de-articulos.tablas.js';
import { unidades } from './unidades.tablas.js';

const unidadBase = alias(unidades, 'unidad_base');

function filtrosDe(filtros: FiltrosDeExistencias): SQL[] {
  const condiciones: SQL[] = [];
  if (!filtros.incluirEnCero) condiciones.push(gt(existencias.cantidad, '0'));
  if (filtros.bodegaId) condiciones.push(eq(existencias.bodegaId, filtros.bodegaId));
  if (filtros.articuloId) condiciones.push(eq(existencias.articuloId, filtros.articuloId));
  if (filtros.categoriaId) condiciones.push(eq(articulos.categoriaId, filtros.categoriaId));
  if (filtros.tipoDeInventario) condiciones.push(eq(articulos.tipoDeInventario, filtros.tipoDeInventario));
  return condiciones;
}

const columnasDeKardex = {
  movimientoId: movimientos.id,
  documentoId: movimientos.documentoId,
  clase: documentos.clase,
  numeroDeDocumento: documentos.numero,
  fecha: movimientos.fecha,
  bodegaId: movimientos.bodegaId,
  bodegaNombre: bodegas.nombre,
  loteCodigo: lotes.codigo,
  tipo: movimientos.tipo,
  cantidad: movimientos.cantidad,
  costoUnitario: movimientos.costoUnitario,
  costoTotal: movimientos.costoTotal,
  saldoCantidad: movimientos.saldoCantidad,
  saldoValor: movimientos.saldoValor,
};

type CamposNumericos = 'cantidad' | 'costoUnitario' | 'costoTotal' | 'saldoCantidad' | 'saldoValor';

/** Lo que devuelve la base: los `numeric` llegan como texto. */
type FilaCruda = Omit<FilaDeKardex, CamposNumericos> & Record<CamposNumericos, string>;

function aFilaDeKardex(fila: FilaCruda): FilaDeKardex {
  return {
    ...fila,
    cantidad: aDiezmilesimas(fila.cantidad),
    costoUnitario: aMillonesimas(fila.costoUnitario),
    costoTotal: aCentavosEnteros(fila.costoTotal),
    saldoCantidad: aDiezmilesimas(fila.saldoCantidad),
    saldoValor: aCentavosEnteros(fila.saldoValor),
  };
}

/**
 * Las existencias salen de `existencias` (con su seguridad por bodega) y el costo, de `saldos_de_articulos`: de ese
 * saldo solo se toma el costo promedio (un precio), nunca la cantidad de toda la empresa.
 */
export class ConsultasDeExistenciasDrizzle {
  async listar(filtros: FiltrosDeExistencias): Promise<ExistenciaDto[]> {
    const filas = await transaccionEnCurso()
      .select({
        bodegaId: existencias.bodegaId,
        bodegaNombre: bodegas.nombre,
        articuloId: existencias.articuloId,
        articuloCodigo: articulos.codigo,
        articuloNombre: articulos.nombre,
        tipoDeInventario: articulos.tipoDeInventario,
        loteId: existencias.loteId,
        loteCodigo: lotes.codigo,
        cantidad: existencias.cantidad,
        unidadBaseNombre: unidadBase.nombre,
        costoPromedio: saldosDeArticulos.costoPromedio,
      })
      .from(existencias)
      .innerJoin(bodegas, eq(bodegas.id, existencias.bodegaId))
      .innerJoin(articulos, eq(articulos.id, existencias.articuloId))
      .innerJoin(unidadBase, eq(unidadBase.id, articulos.unidadBaseId))
      .leftJoin(lotes, eq(lotes.id, existencias.loteId))
      .leftJoin(saldosDeArticulos, eq(saldosDeArticulos.articuloId, existencias.articuloId))
      .where(and(...filtrosDe(filtros)))
      .orderBy(asc(articulos.codigo), asc(bodegas.nombre), asc(lotes.codigo));
    return filas.map(({ costoPromedio, ...fila }) => this.aExistencia(fila, costoPromedio ?? '0'));
  }

  private aExistencia(fila: Omit<ExistenciaDto, 'costoUnitario' | 'valor'>, costoPromedio: string): ExistenciaDto {
    const valor = valorDe(aMillonesimas(costoPromedio), aDiezmilesimas(fila.cantidad));
    return { ...fila, costoUnitario: deMillonesimas(aMillonesimas(costoPromedio)), valor: deCentavosEnteros(valor) };
  }

  async articulo(id: string): Promise<ArticuloDeKardex> {
    const [fila] = await transaccionEnCurso()
      .select({
        id: articulos.id,
        codigo: articulos.codigo,
        nombre: articulos.nombre,
        unidadBaseNombre: unidadBase.nombre,
      })
      .from(articulos)
      .innerJoin(unidadBase, eq(unidadBase.id, articulos.unidadBaseId))
      .where(eq(articulos.id, id));
    if (!fila) throw new RecursoNoEncontrado('El artículo');
    return fila;
  }

  /**
   * Los movimientos vigentes del artículo, unidos a su documento (R-3), en el orden del kardex. Con bodega, la bodega
   * debe ser una que el usuario ve.
   */
  async filas(articuloId: string, bodegaId: string | null): Promise<FilaDeKardex[]> {
    if (bodegaId) await this.exigirBodega(bodegaId);
    const condiciones = [eq(movimientos.articuloId, articuloId), eq(movimientos.vigente, true)];
    if (bodegaId) condiciones.push(eq(movimientos.bodegaId, bodegaId));
    const filas = await transaccionEnCurso()
      .select(columnasDeKardex)
      .from(movimientos)
      .innerJoin(documentos, eq(documentos.id, movimientos.documentoId))
      .leftJoin(bodegas, eq(bodegas.id, movimientos.bodegaId))
      .leftJoin(lotes, eq(lotes.id, movimientos.loteId))
      .where(and(...condiciones))
      .orderBy(asc(movimientos.fecha), asc(movimientos.ordenDelDia), asc(movimientos.secuencia));
    return filas.map(aFilaDeKardex);
  }

  private async exigirBodega(bodegaId: string): Promise<void> {
    const [fila] = await transaccionEnCurso().select({ id: bodegas.id }).from(bodegas).where(eq(bodegas.id, bodegaId));
    if (!fila) throw new RecursoNoEncontrado('La bodega');
  }
}
