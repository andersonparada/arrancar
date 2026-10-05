import { and, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  CatalogosParaDocumentos,
  CombustibleConTasa,
  ConceptoParaLinea,
} from '../../aplicacion/puertos/puertos-de-documentos.js';
import { combustibles } from './combustibles.tablas.js';
import { conceptosDeGasto } from './conceptos-de-gasto.tablas.js';
import { vigenciasDeCombustible } from './vigencias-de-combustible.tablas.js';

/** La vigencia del combustible que rige en `fecha`: desde ella y, si tiene cierre, hasta ella (los dos extremos cuentan). */
const vigenciaQueRige = (fecha: string) =>
  and(
    eq(vigenciasDeCombustible.combustibleId, combustibles.id),
    lte(vigenciasDeCombustible.vigenteDesde, fecha),
    or(isNull(vigenciasDeCombustible.vigenteHasta), gte(vigenciasDeCombustible.vigenteHasta, fecha)),
  );

/** Lee los catálogos de la empresa; la seguridad por empresa (RLS) oculta los de otras. */
export class CatalogosParaDocumentosDrizzle implements CatalogosParaDocumentos {
  async conceptos(ids: readonly string[]): Promise<ConceptoParaLinea[]> {
    if (ids.length === 0) return [];
    return transaccionEnCurso()
      .select({
        id: conceptosDeGasto.id,
        nombre: conceptosDeGasto.nombre,
        tipoPorOmision: conceptosDeGasto.tipoPorOmision,
        esProductoAgropecuario: conceptosDeGasto.esProductoAgropecuario,
        esActivoFijo: conceptosDeGasto.esActivoFijo,
        activo: conceptosDeGasto.activo,
      })
      .from(conceptosDeGasto)
      .where(inArray(conceptosDeGasto.id, [...ids]));
  }

  /** Cada combustible con la tasa que rige en `fecha`; sin tasa, `vigencia` es `null`. */
  async combustiblesConTasa(ids: readonly string[], fecha: string): Promise<CombustibleConTasa[]> {
    if (ids.length === 0) return [];
    const filas = await transaccionEnCurso()
      .select({
        combustibleId: combustibles.id,
        nombre: combustibles.nombre,
        activo: combustibles.activo,
        vigenciaId: vigenciasDeCombustible.id,
        idpPorGalon: vigenciasDeCombustible.idpPorGalon,
        porcentajeDeEtanol: vigenciasDeCombustible.porcentajeDeEtanol,
      })
      .from(combustibles)
      .leftJoin(vigenciasDeCombustible, vigenciaQueRige(fecha))
      .where(inArray(combustibles.id, [...ids]));
    return filas.map(({ vigenciaId, idpPorGalon, porcentajeDeEtanol, ...combustible }) => ({
      ...combustible,
      vigencia: vigenciaId
        ? { id: vigenciaId, idpPorGalon: idpPorGalon!, porcentajeDeEtanol: porcentajeDeEtanol! }
        : null,
    }));
  }
}
