import { asc, eq, getTableColumns, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { exigirQueExista } from '../../../core/compartido/infraestructura/exigir-que-exista.js';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import type { ArticuloDto, SolicitudDeArticulo } from '../../aplicacion/dto/articulo.dto.js';
import type { ConsultasArticulos } from '../../aplicacion/puertos/consultas-articulos.js';
import { mapeadorDeArticulo } from './articulo.mapeador.js';
import { articulos } from './articulos.tablas.js';
import { categorias } from './categorias.tablas.js';
import { unidades } from './unidades.tablas.js';

const categoria = alias(categorias, 'categoria');
const unidadBase = alias(unidades, 'unidad_base');

const columnas = {
  ...getTableColumns(articulos),
  categoriaNombre: categoria.nombre,
  unidadBaseNombre: unidadBase.nombre,
  conceptoDeGastoNombre: conceptosDeGasto.nombre,
};

export class ConsultasArticulosDrizzle implements ConsultasArticulos {
  async listar(): Promise<ArticuloDto[]> {
    const filas = await this.consulta().orderBy(asc(articulos.codigo));
    return filas.map(mapeadorDeArticulo.aDto);
  }

  async obtener(articuloId: string): Promise<ArticuloDto> {
    const [fila] = await this.consulta().where(eq(articulos.id, articuloId));
    if (!fila) throw new RecursoNoEncontrado('El artículo');
    return mapeadorDeArticulo.aDto(fila);
  }

  /** Lo elegido debe existir y ser de la empresa: la seguridad por filas oculta lo ajeno. */
  async exigirReferencias(solicitud: SolicitudDeArticulo): Promise<void> {
    await exigirQueExista(categorias, solicitud.categoriaId, 'La categoría');
    await exigirQueExista(unidades, solicitud.unidadBaseId, 'La unidad de medida');
    if (solicitud.conceptoDeGastoId)
      await exigirQueExista(conceptosDeGasto, solicitud.conceptoDeGastoId, 'El concepto de gasto');
  }

  async existeCodigo(codigo: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: articulos.id })
      .from(articulos)
      .where(sql`upper(${articulos.codigo}) = upper(${codigo})`)
      .limit(1);
    return fila !== undefined;
  }

  private consulta() {
    return transaccionEnCurso()
      .select(columnas)
      .from(articulos)
      .leftJoin(categoria, eq(articulos.categoriaId, categoria.id))
      .leftJoin(unidadBase, eq(articulos.unidadBaseId, unidadBase.id))
      .leftJoin(conceptosDeGasto, eq(articulos.conceptoDeGastoId, conceptosDeGasto.id));
  }
}
