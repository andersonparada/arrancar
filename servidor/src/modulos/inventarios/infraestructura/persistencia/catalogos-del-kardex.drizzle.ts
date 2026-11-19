import { eq, inArray } from 'drizzle-orm';
import { exigirQueExista } from '../../../core/compartido/infraestructura/exigir-que-exista.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { departamentos } from '../../../empresas/infraestructura/persistencia/departamentos.tablas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import type {
  ArticuloParaMovimiento,
  BodegaParaMovimiento,
  CatalogosDelKardex,
  LoteParaMovimiento,
  ReferenciasDeSalida,
} from '../../aplicacion/puertos/catalogos-del-kardex.js';
import type { ConversionDeArticulo } from '../../dominio/conversion.js';
import type { UnidadParaConvertir } from '../../dominio/conversion-a-base.js';
import { articulos } from './articulos.tablas.js';
import { bodegas } from './bodegas.tablas.js';
import { conversiones } from './conversiones.tablas.js';
import { lotes } from './lotes.tablas.js';
import { unidades } from './unidades.tablas.js';

/** Las tablas tienen seguridad por empresa (RLS); la de bodegas, además, solo deja ver las asignadas. */
export class CatalogosDelKardexDrizzle implements CatalogosDelKardex {
  async articulos(ids: readonly string[]): Promise<ArticuloParaMovimiento[]> {
    if (ids.length === 0) return [];
    return transaccionEnCurso()
      .select({
        id: articulos.id,
        codigo: articulos.codigo,
        nombre: articulos.nombre,
        tipoDeInventario: articulos.tipoDeInventario,
        unidadBaseId: articulos.unidadBaseId,
        manejaLotes: articulos.manejaLotes,
        conceptoDeGastoId: articulos.conceptoDeGastoId,
        activo: articulos.activo,
      })
      .from(articulos)
      .where(inArray(articulos.id, [...ids]));
  }

  async unidades(ids: readonly string[]): Promise<UnidadParaConvertir[]> {
    if (ids.length === 0) return [];
    return transaccionEnCurso()
      .select({ id: unidades.id, magnitud: unidades.magnitud, factorALaReferencia: unidades.factorALaReferencia })
      .from(unidades)
      .where(inArray(unidades.id, [...ids]));
  }

  async conversionesDe(articuloIds: readonly string[]): Promise<Map<string, ConversionDeArticulo[]>> {
    const porArticulo = new Map<string, ConversionDeArticulo[]>();
    if (articuloIds.length === 0) return porArticulo;
    const filas = await transaccionEnCurso()
      .select()
      .from(conversiones)
      .where(inArray(conversiones.articuloId, [...articuloIds]));
    for (const fila of filas) {
      const lista = porArticulo.get(fila.articuloId) ?? [];
      lista.push({ unidadId: fila.unidadId, factor: fila.factor, paraCompras: fila.paraCompras });
      porArticulo.set(fila.articuloId, lista);
    }
    return porArticulo;
  }

  async lotes(ids: readonly string[]): Promise<LoteParaMovimiento[]> {
    if (ids.length === 0) return [];
    return transaccionEnCurso()
      .select({ id: lotes.id, articuloId: lotes.articuloId })
      .from(lotes)
      .where(inArray(lotes.id, [...ids]));
  }

  async bodega(id: string): Promise<BodegaParaMovimiento | null> {
    const [fila] = await transaccionEnCurso()
      .select({ id: bodegas.id, nombre: bodegas.nombre, activo: bodegas.activo })
      .from(bodegas)
      .where(eq(bodegas.id, id));
    return fila ?? null;
  }

  /** Lo elegido debe existir y ser de la empresa: la seguridad por filas oculta lo ajeno. */
  async exigirReferencias(referencias: ReferenciasDeSalida): Promise<void> {
    await exigirQueExista(conceptosDeGasto, referencias.conceptoDeGastoId, 'El concepto de gasto');
    await exigirQueExista(localidades, referencias.localidadId, 'La localidad');
    await exigirQueExista(departamentos, referencias.departamentoId, 'El departamento');
  }
}
